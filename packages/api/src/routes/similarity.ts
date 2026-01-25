import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import {
  sendData,
  sendValidationError,
  sendInternalError,
} from "../utils/response.js";
import { hasOpenAIClient } from "../services/embedding.js";
import { findSimilarToEntity, findSimilarByText } from "../services/similarity.js";

// =============================================================================
// Schemas
// =============================================================================

const SimilarQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  threshold: z.coerce.number().min(0).max(1).optional().default(0.7),
});

const SimilarByTextSchema = z.object({
  text: z.string().min(1).max(2000),
  types: z.array(z.enum(["task", "project", "idea", "person"])).optional(),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  threshold: z.coerce.number().min(0).max(1).optional().default(0.7),
});

const EntityTypeParamSchema = z.enum(["tasks", "projects", "ideas", "persons"]);

// =============================================================================
// Routes
// =============================================================================

export async function similarityRoutes(app: FastifyInstance): Promise<void> {
  /**
   * Find items similar to a specific entity.
   * GET /tasks/:id/similar
   * GET /projects/:id/similar
   * GET /ideas/:id/similar
   * GET /persons/:id/similar
   */
  app.get(
    "/:entityType/:id/similar",
    async (
      request: FastifyRequest<{
        Params: { entityType: string; id: string };
        Querystring: z.infer<typeof SimilarQuerySchema>;
      }>,
      reply: FastifyReply
    ) => {
      const entityTypeResult = EntityTypeParamSchema.safeParse(request.params.entityType);
      if (!entityTypeResult.success) {
        return sendValidationError(reply, `Invalid entity type: ${request.params.entityType}`);
      }

      const parseResult = SimilarQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(reply, "Validation failed", parseResult.error.flatten().fieldErrors);
      }

      const { limit, threshold } = parseResult.data;

      try {
        const typeMap: Record<string, "task" | "project" | "idea" | "person"> = {
          tasks: "task",
          projects: "project",
          ideas: "idea",
          persons: "person",
        };

        const results = await findSimilarToEntity(
          typeMap[entityTypeResult.data],
          request.params.id,
          limit,
          threshold
        );

        return sendData(reply, results, {
          entityId: request.params.id,
          entityType: typeMap[entityTypeResult.data],
          count: results.length,
          threshold,
        });
      } catch (error) {
        app.log.error(error);
        return sendInternalError(reply, "Similarity search failed");
      }
    }
  );

  /**
   * Find items similar to arbitrary text.
   * POST /similar
   */
  app.post(
    "/similar",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof SimilarByTextSchema> }>,
      reply: FastifyReply
    ) => {
      if (!hasOpenAIClient()) {
        return sendValidationError(reply, "Similarity search requires OPENAI_API_KEY");
      }

      const parseResult = SimilarByTextSchema.safeParse(request.body);
      if (!parseResult.success) {
        return sendValidationError(reply, "Validation failed", parseResult.error.flatten().fieldErrors);
      }

      const { text, types, limit, threshold } = parseResult.data;

      try {
        const results: Record<string, unknown[]> = {};
        const typesToSearch = types || ["task", "project", "idea", "person"];

        const tableMap: Record<string, string> = {
          task: "tasks",
          project: "projects",
          idea: "ideas",
          person: "persons",
        };

        const searches = await Promise.all(
          typesToSearch.map(async (type) => {
            const tableResults = await findSimilarByText(
              tableMap[type] as any,
              text,
              limit,
              threshold
            );
            return { type, results: tableResults };
          })
        );

        for (const { type, results: typeResults } of searches) {
          if (typeResults.length > 0) {
            results[type] = typeResults;
          }
        }

        return sendData(reply, results, {
          query: text.substring(0, 100) + (text.length > 100 ? "..." : ""),
          threshold,
        });
      } catch (error) {
        app.log.error(error);
        return sendInternalError(reply, "Similarity search failed");
      }
    }
  );
}
