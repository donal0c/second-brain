import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { processInboxItem, processBatch } from "../services/processor.js";
import { hasLLMProvider } from "../llm/index.js";

// =============================================================================
// Request Schemas
// =============================================================================

const ProcessParamsSchema = z.object({
  id: z.string().uuid(),
});

const BatchBodySchema = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
});

// =============================================================================
// Route Handlers
// =============================================================================

export async function processRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /process/:id - Process a single inbox item
   */
  app.post(
    "/process/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof ProcessParamsSchema> }>,
      reply: FastifyReply
    ) => {
      // Check LLM availability
      if (!hasLLMProvider()) {
        return reply.status(503).send({
          error: "Service unavailable",
          message: "LLM provider not configured. Set ANTHROPIC_API_KEY to enable processing.",
        });
      }

      // Validate params
      const parseResult = ProcessParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid ID format",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { id } = parseResult.data;

      try {
        const result = await processInboxItem(id);
        request.log.info(
          { inboxItemId: id, action: result.action, classification: result.classification.classification },
          "Processed inbox item"
        );
        return reply.send(result);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("not found")) {
            return reply.status(404).send({
              error: "Not found",
              message: error.message,
            });
          }
          if (error.message.includes("not in 'new' status")) {
            return reply.status(409).send({
              error: "Conflict",
              message: error.message,
            });
          }
        }
        throw error;
      }
    }
  );

  /**
   * POST /process/batch - Process multiple pending inbox items
   */
  app.post(
    "/process/batch",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof BatchBodySchema> }>,
      reply: FastifyReply
    ) => {
      // Check LLM availability
      if (!hasLLMProvider()) {
        return reply.status(503).send({
          error: "Service unavailable",
          message: "LLM provider not configured. Set ANTHROPIC_API_KEY to enable processing.",
        });
      }

      // Validate body
      const parseResult = BatchBodySchema.safeParse(request.body || {});
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { limit } = parseResult.data;

      const result = await processBatch(limit);
      request.log.info({ processed: result.processed }, "Batch processing complete");

      return reply.send({
        processed: result.processed,
        receipts: result.results.map((r) => r.receipt),
      });
    }
  );

  /**
   * GET /process/status - Check if processing is available
   */
  app.get("/process/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    const available = hasLLMProvider();
    return reply.send({
      available,
      message: available
        ? "Processing is available"
        : "LLM provider not configured. Set ANTHROPIC_API_KEY to enable processing.",
    });
  });
}
