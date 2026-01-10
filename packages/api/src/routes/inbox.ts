import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { randomUUID } from "crypto";
import { eq, sql, desc } from "drizzle-orm";
import { db, schema } from "../db/index.js";
// Types from shared package used for reference

// =============================================================================
// Request/Response Types
// =============================================================================

const CaptureBodySchema = z.object({
  rawText: z.string().min(1, "rawText is required"),
  source: z.enum(["web", "api"]).optional().default("web"),
});

const ListQuerySchema = z.object({
  status: z.enum(["new", "processing", "processed", "blocked"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

const IdParamsSchema = z.object({
  id: z.string().uuid(),
});

// =============================================================================
// Route Handlers
// =============================================================================

export async function inboxRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /inbox - Capture a new inbox item
   */
  app.post(
    "/inbox",
    async (
      request: FastifyRequest<{ Body: z.infer<typeof CaptureBodySchema> }>,
      reply: FastifyReply
    ) => {
      // Validate request body
      const parseResult = CaptureBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { rawText, source } = parseResult.data;

      // Create new inbox item
      const id = randomUUID();
      const capturedAt = new Date();

      const newItem = {
        id,
        capturedAt,
        rawText,
        source,
        status: "new" as const,
      };

      await db.insert(schema.inboxItems).values(newItem);

      request.log.info({ id, source }, "Inbox item captured");

      return reply.status(201).send(newItem);
    }
  );

  /**
   * GET /inbox - List inbox items
   */
  app.get(
    "/inbox",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ListQuerySchema> }>,
      reply: FastifyReply
    ) => {
      // Validate query params
      const parseResult = ListQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { status, limit, offset } = parseResult.data;

      // Build query
      let query = db
        .select()
        .from(schema.inboxItems)
        .orderBy(desc(schema.inboxItems.capturedAt))
        .limit(limit)
        .offset(offset);

      // Add status filter if provided
      const items = status
        ? await db
            .select()
            .from(schema.inboxItems)
            .where(eq(schema.inboxItems.status, status))
            .orderBy(desc(schema.inboxItems.capturedAt))
            .limit(limit)
            .offset(offset)
        : await query;

      // Get total count
      const countResult = status
        ? await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.inboxItems)
            .where(eq(schema.inboxItems.status, status))
        : await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.inboxItems);

      const total = countResult[0]?.count ?? 0;

      return reply.send({
        items,
        total,
        limit,
        offset,
      });
    }
  );

  /**
   * GET /inbox/:id - Get a single inbox item
   */
  app.get(
    "/inbox/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      // Validate params
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid ID format",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { id } = parseResult.data;

      // Fetch item
      const items = await db
        .select()
        .from(schema.inboxItems)
        .where(eq(schema.inboxItems.id, id))
        .limit(1);

      if (items.length === 0) {
        return reply.status(404).send({
          error: "Not found",
          message: `Inbox item with id ${id} not found`,
        });
      }

      return reply.send(items[0]);
    }
  );
}
