import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, sql, desc, isNull, isNotNull } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { processInboxItem } from "../services/processor.js";
import { hasLLMProvider } from "../llm/index.js";
import {
  sendData,
  sendList,
  sendNotFound,
  sendValidationError,
  sendBadRequest,
  sendConflict,
  sendServiceUnavailable,
} from "../utils/response.js";

// =============================================================================
// Request Schemas
// =============================================================================

const ReceiptQuerySchema = z.object({
  inboxItemId: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

const ClarificationQuerySchema = z.object({
  resolved: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

const IdParamsSchema = z.object({
  id: z.string().uuid(),
});

const ResolveBodySchema = z.object({
  answer: z.string().min(1),
});

// =============================================================================
// Receipt Routes
// =============================================================================

export async function receiptRoutes(app: FastifyInstance): Promise<void> {
  // GET /receipts - List receipts
  app.get(
    "/receipts",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ReceiptQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = ReceiptQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          parseResult.error.flatten().fieldErrors
        );
      }

      const { inboxItemId, limit, offset } = parseResult.data;

      const items = inboxItemId
        ? await db
            .select()
            .from(schema.receipts)
            .where(eq(schema.receipts.inboxItemId, inboxItemId))
            .orderBy(desc(schema.receipts.timestamp))
            .limit(limit)
            .offset(offset)
        : await db
            .select()
            .from(schema.receipts)
            .orderBy(desc(schema.receipts.timestamp))
            .limit(limit)
            .offset(offset);

      const countResult = inboxItemId
        ? await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.receipts)
            .where(eq(schema.receipts.inboxItemId, inboxItemId))
        : await db.select({ count: sql<number>`count(*)` }).from(schema.receipts);

      return sendList(reply, items, {
        total: countResult[0]?.count ?? 0,
        limit,
        offset,
      });
    }
  );

  // GET /receipts/:id - Get single receipt
  app.get(
    "/receipts/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return sendBadRequest(reply, "Invalid ID format");
      }

      const items = await db
        .select()
        .from(schema.receipts)
        .where(eq(schema.receipts.id, parseResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return sendNotFound(reply, "Receipt");
      }

      return sendData(reply, items[0]);
    }
  );
}

// =============================================================================
// Clarification Routes
// =============================================================================

export async function clarificationRoutes(app: FastifyInstance): Promise<void> {
  // GET /clarifications - List clarifications
  app.get(
    "/clarifications",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ClarificationQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = ClarificationQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          parseResult.error.flatten().fieldErrors
        );
      }

      const { resolved, limit, offset } = parseResult.data;

      let items;
      let countResult;

      if (resolved === "true") {
        items = await db
          .select()
          .from(schema.clarifications)
          .where(isNotNull(schema.clarifications.resolvedAt))
          .orderBy(desc(schema.clarifications.createdAt))
          .limit(limit)
          .offset(offset);
        countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.clarifications)
          .where(isNotNull(schema.clarifications.resolvedAt));
      } else if (resolved === "false") {
        items = await db
          .select()
          .from(schema.clarifications)
          .where(isNull(schema.clarifications.resolvedAt))
          .orderBy(desc(schema.clarifications.createdAt))
          .limit(limit)
          .offset(offset);
        countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(schema.clarifications)
          .where(isNull(schema.clarifications.resolvedAt));
      } else {
        items = await db
          .select()
          .from(schema.clarifications)
          .orderBy(desc(schema.clarifications.createdAt))
          .limit(limit)
          .offset(offset);
        countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.clarifications);
      }

      return sendList(reply, items, {
        total: countResult[0]?.count ?? 0,
        limit,
        offset,
      });
    }
  );

  // GET /clarifications/:id - Get single clarification
  app.get(
    "/clarifications/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return sendBadRequest(reply, "Invalid ID format");
      }

      const items = await db
        .select()
        .from(schema.clarifications)
        .where(eq(schema.clarifications.id, parseResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return sendNotFound(reply, "Clarification");
      }

      return sendData(reply, items[0]);
    }
  );

  // POST /clarifications/:id/resolve - Resolve a clarification
  app.post(
    "/clarifications/:id/resolve",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamsSchema>;
        Body: z.infer<typeof ResolveBodySchema>;
      }>,
      reply: FastifyReply
    ) => {
      // Check LLM availability
      if (!hasLLMProvider()) {
        return sendServiceUnavailable(
          reply,
          "LLM provider not configured. Set ANTHROPIC_API_KEY to enable processing."
        );
      }

      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendBadRequest(reply, "Invalid ID format");
      }

      const bodyResult = ResolveBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          bodyResult.error.flatten().fieldErrors
        );
      }

      // Get the clarification
      const clarifications = await db
        .select()
        .from(schema.clarifications)
        .where(eq(schema.clarifications.id, paramsResult.data.id))
        .limit(1);

      if (clarifications.length === 0) {
        return sendNotFound(reply, "Clarification");
      }

      const clarification = clarifications[0];

      if (clarification.resolvedAt) {
        return sendConflict(reply, "Clarification already resolved");
      }

      // Update the clarification with the answer
      await db
        .update(schema.clarifications)
        .set({
          userAnswer: bodyResult.data.answer,
          resolvedAt: new Date(),
        })
        .where(eq(schema.clarifications.id, paramsResult.data.id));

      // Reset the inbox item status to allow reprocessing
      await db
        .update(schema.inboxItems)
        .set({ status: "new" })
        .where(eq(schema.inboxItems.id, clarification.inboxItemId));

      // Reprocess the inbox item with the clarification context
      try {
        const processResult = await processInboxItem(clarification.inboxItemId, {
          question: clarification.question,
          answer: bodyResult.data.answer,
        });

        // Fetch the updated clarification
        const updatedClarifications = await db
          .select()
          .from(schema.clarifications)
          .where(eq(schema.clarifications.id, paramsResult.data.id))
          .limit(1);

        return sendData(reply, {
          clarification: updatedClarifications[0],
          receipt: processResult.receipt,
          entity: processResult.entity,
        });
      } catch (error) {
        // If reprocessing fails, still return the resolved clarification
        const updatedClarifications = await db
          .select()
          .from(schema.clarifications)
          .where(eq(schema.clarifications.id, paramsResult.data.id))
          .limit(1);

        return sendData(reply, {
          clarification: updatedClarifications[0],
          processingError: error instanceof Error ? error.message : "Processing failed",
        });
      }
    }
  );
}
