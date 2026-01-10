// =============================================================================
// Personal Context API Routes
// =============================================================================
// Endpoints for viewing and managing learned personal context entities.

import type { FastifyInstance } from "fastify";
import { eq, isNull, gte, desc, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { UpdatePersonalContextSchema } from "@second-brain/shared";

export async function contextRoutes(fastify: FastifyInstance) {
  // ---------------------------------------------------------------------------
  // GET /context - List all personal context entities
  // ---------------------------------------------------------------------------
  fastify.get("/context", async (_request, reply) => {
    const contexts = await db
      .select()
      .from(schema.personalContexts)
      .orderBy(schema.personalContexts.mentionCount);

    // Sort by mention count descending (most mentioned first)
    const sorted = contexts.sort((a, b) => b.mentionCount - a.mentionCount);

    return reply.send({
      entities: sorted,
      total: sorted.length,
    });
  });

  // ---------------------------------------------------------------------------
  // GET /context/:id - Get a specific context entity
  // ---------------------------------------------------------------------------
  fastify.get<{ Params: { id: string } }>("/context/:id", async (request, reply) => {
    const { id } = request.params;

    const results = await db
      .select()
      .from(schema.personalContexts)
      .where(eq(schema.personalContexts.id, id))
      .limit(1);

    if (results.length === 0) {
      return reply.status(404).send({ error: "Context entity not found" });
    }

    return reply.send(results[0]);
  });

  // ---------------------------------------------------------------------------
  // PATCH /context/:id - Update a context entity (description, domain)
  // ---------------------------------------------------------------------------
  fastify.patch<{ Params: { id: string }; Body: unknown }>(
    "/context/:id",
    async (request, reply) => {
      const { id } = request.params;

      // Validate body
      const parsed = UpdatePersonalContextSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Invalid request body",
          details: parsed.error.issues,
        });
      }

      // Check entity exists
      const existing = await db
        .select()
        .from(schema.personalContexts)
        .where(eq(schema.personalContexts.id, id))
        .limit(1);

      if (existing.length === 0) {
        return reply.status(404).send({ error: "Context entity not found" });
      }

      // Build update object (only include provided fields)
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (parsed.data.description !== undefined) {
        updates.description = parsed.data.description;
      }
      if (parsed.data.domain !== undefined) {
        updates.domain = parsed.data.domain;
      }

      // Update
      await db
        .update(schema.personalContexts)
        .set(updates)
        .where(eq(schema.personalContexts.id, id));

      // Return updated entity
      const updated = await db
        .select()
        .from(schema.personalContexts)
        .where(eq(schema.personalContexts.id, id))
        .limit(1);

      return reply.send(updated[0]);
    }
  );

  // ---------------------------------------------------------------------------
  // GET /context/undescribed - Get entities without descriptions
  // ---------------------------------------------------------------------------
  // Used by daily digest to surface "New people/places I noticed"
  fastify.get<{ Querystring: { minMentions?: string; since?: string } }>(
    "/context/undescribed",
    async (request, reply) => {
      const minMentions = parseInt(request.query.minMentions || "1", 10);
      const sinceHours = request.query.since
        ? parseInt(request.query.since.replace("h", ""), 10)
        : null;

      let query = db
        .select()
        .from(schema.personalContexts)
        .where(
          and(
            isNull(schema.personalContexts.description),
            gte(schema.personalContexts.mentionCount, minMentions)
          )
        )
        .orderBy(desc(schema.personalContexts.mentionCount));

      const results = await query;

      // Filter by time if specified
      let filtered = results;
      if (sinceHours) {
        const cutoff = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
        filtered = results.filter((ctx) => ctx.createdAt >= cutoff);
      }

      return reply.send({
        entities: filtered,
        total: filtered.length,
      });
    }
  );

  // ---------------------------------------------------------------------------
  // GET /context/questions - Generate clarification questions for weekly review
  // ---------------------------------------------------------------------------
  // For entities mentioned frequently but never described
  fastify.get<{ Querystring: { minMentions?: string } }>(
    "/context/questions",
    async (request, reply) => {
      const minMentions = parseInt(request.query.minMentions || "5", 10);

      const undescribed = await db
        .select()
        .from(schema.personalContexts)
        .where(
          and(
            isNull(schema.personalContexts.description),
            gte(schema.personalContexts.mentionCount, minMentions)
          )
        )
        .orderBy(desc(schema.personalContexts.mentionCount));

      const questions = undescribed.map((ctx) => {
        const typeLabel = ctx.type === "person" ? "person" : ctx.type;
        return {
          contextId: ctx.id,
          name: ctx.name,
          type: ctx.type,
          mentionCount: ctx.mentionCount,
          domain: ctx.domain,
          suggestedQuestion: `You've mentioned ${ctx.name} ${ctx.mentionCount} times. Who/what is this ${typeLabel}?`,
        };
      });

      return reply.send({
        questions,
        total: questions.length,
      });
    }
  );

  // ---------------------------------------------------------------------------
  // DELETE /context/:id - Delete a context entity
  // ---------------------------------------------------------------------------
  fastify.delete<{ Params: { id: string } }>(
    "/context/:id",
    async (request, reply) => {
      const { id } = request.params;

      // Check entity exists
      const existing = await db
        .select()
        .from(schema.personalContexts)
        .where(eq(schema.personalContexts.id, id))
        .limit(1);

      if (existing.length === 0) {
        return reply.status(404).send({ error: "Context entity not found" });
      }

      // Delete
      await db
        .delete(schema.personalContexts)
        .where(eq(schema.personalContexts.id, id));

      return reply.status(204).send();
    }
  );
}
