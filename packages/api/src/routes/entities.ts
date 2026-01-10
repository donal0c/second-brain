import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { z } from "zod";
import { eq, sql, desc, asc, like } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { getLLMProvider, hasLLMProvider } from "../llm/index.js";

// =============================================================================
// Shared Schemas
// =============================================================================

const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
  sort: z.enum(["created", "-created", "updated", "-updated"]).optional().default("-updated"),
});

const IdParamsSchema = z.object({
  id: z.string().uuid(),
});

const NaturalLanguageEditSchema = z.object({
  instruction: z.string().min(1).max(500),
});

// =============================================================================
// Task Schemas
// =============================================================================

const TaskQuerySchema = PaginationSchema.extend({
  status: z.enum(["active", "completed", "waiting", "someday"]).optional(),
  context: z.string().optional(),
});

const TaskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  nextAction: z.string().min(1).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  context: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "waiting", "someday"]).optional(),
});

// =============================================================================
// Project Schemas
// =============================================================================

const ProjectQuerySchema = PaginationSchema.extend({
  status: z.enum(["active", "completed", "on_hold", "someday"]).optional(),
});

const ProjectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  desiredOutcome: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "on_hold", "someday"]).optional(),
});

// =============================================================================
// Idea Schemas
// =============================================================================

const IdeaQuerySchema = PaginationSchema;

const IdeaUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  links: z.array(z.string().url()).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getSortOrder(sort: string, table: typeof schema.tasks | typeof schema.projects | typeof schema.ideas) {
  switch (sort) {
    case "created":
      return asc(table.createdAt);
    case "-created":
      return desc(table.createdAt);
    case "updated":
      return asc(table.updatedAt);
    case "-updated":
    default:
      return desc(table.updatedAt);
  }
}

// =============================================================================
// Task Routes
// =============================================================================

async function taskRoutes(app: FastifyInstance): Promise<void> {
  // GET /tasks - List tasks
  app.get(
    "/tasks",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof TaskQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = TaskQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { status, context, limit, offset, sort } = parseResult.data;

      // Build conditions
      const conditions = [];
      if (status) {
        conditions.push(eq(schema.tasks.status, status));
      }
      if (context) {
        conditions.push(like(schema.tasks.context, `%${context}%`));
      }

      // Execute query
      const items =
        conditions.length > 0
          ? await db
              .select()
              .from(schema.tasks)
              .where(sql`${conditions.map((c) => sql`${c}`).reduce((a, b) => sql`${a} AND ${b}`)}`)
              .orderBy(getSortOrder(sort, schema.tasks))
              .limit(limit)
              .offset(offset)
          : await db
              .select()
              .from(schema.tasks)
              .orderBy(getSortOrder(sort, schema.tasks))
              .limit(limit)
              .offset(offset);

      // Get total count
      const countResult =
        conditions.length > 0
          ? await db
              .select({ count: sql<number>`count(*)` })
              .from(schema.tasks)
              .where(sql`${conditions.map((c) => sql`${c}`).reduce((a, b) => sql`${a} AND ${b}`)}`)
          : await db.select({ count: sql<number>`count(*)` }).from(schema.tasks);

      return reply.send({
        items,
        total: countResult[0]?.count ?? 0,
        limit,
        offset,
      });
    }
  );

  // GET /tasks/:id - Get single task
  app.get(
    "/tasks/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const items = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, parseResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return reply.status(404).send({ error: "Task not found" });
      }

      return reply.send(items[0]);
    }
  );

  // PATCH /tasks/:id - Update task
  app.patch(
    "/tasks/:id",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamsSchema>;
        Body: z.infer<typeof TaskUpdateSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const bodyResult = TaskUpdateSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const updates = { ...bodyResult.data, updatedAt: new Date() };

      const result = await db
        .update(schema.tasks)
        .set(updates)
        .where(eq(schema.tasks.id, paramsResult.data.id))
        .returning();

      if (result.length === 0) {
        return reply.status(404).send({ error: "Task not found" });
      }

      return reply.send(result[0]);
    }
  );

  // DELETE /tasks/:id - Delete task
  app.delete(
    "/tasks/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const result = await db
        .delete(schema.tasks)
        .where(eq(schema.tasks.id, parseResult.data.id))
        .returning();

      if (result.length === 0) {
        return reply.status(404).send({ error: "Task not found" });
      }

      return reply.status(204).send();
    }
  );

  // POST /tasks/:id/interpret - Natural language edit
  app.post(
    "/tasks/:id/interpret",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamsSchema>;
        Body: z.infer<typeof NaturalLanguageEditSchema>;
      }>,
      reply: FastifyReply
    ) => {
      if (!hasLLMProvider()) {
        return reply.status(503).send({
          error: "Service unavailable",
          message: "LLM provider not configured",
        });
      }

      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const bodyResult = NaturalLanguageEditSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      // Fetch existing task
      const items = await db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.id, paramsResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return reply.status(404).send({ error: "Task not found" });
      }

      const task = items[0];
      const provider = getLLMProvider();

      // Interpret the natural language instruction
      const interpretation = await provider.interpretCorrection(
        {
          title: task.title,
          nextAction: task.nextAction,
          dueDate: task.dueDate,
          context: task.context,
          status: task.status,
        },
        bodyResult.data.instruction
      );

      // Validate and apply updates
      const updateResult = TaskUpdateSchema.safeParse(interpretation.updates);
      if (!updateResult.success) {
        return reply.status(400).send({
          error: "AI interpretation produced invalid updates",
          details: updateResult.error.flatten().fieldErrors,
          interpretation,
        });
      }

      const updates = { ...updateResult.data, updatedAt: new Date() };

      const result = await db
        .update(schema.tasks)
        .set(updates)
        .where(eq(schema.tasks.id, paramsResult.data.id))
        .returning();

      return reply.send({
        entity: result[0],
        interpretation: {
          updates: interpretation.updates,
          reasoning: interpretation.reasoning,
        },
      });
    }
  );
}

// =============================================================================
// Project Routes
// =============================================================================

async function projectRoutes(app: FastifyInstance): Promise<void> {
  // GET /projects - List projects
  app.get(
    "/projects",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ProjectQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = ProjectQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { status, limit, offset, sort } = parseResult.data;

      const items = status
        ? await db
            .select()
            .from(schema.projects)
            .where(eq(schema.projects.status, status))
            .orderBy(getSortOrder(sort, schema.projects))
            .limit(limit)
            .offset(offset)
        : await db
            .select()
            .from(schema.projects)
            .orderBy(getSortOrder(sort, schema.projects))
            .limit(limit)
            .offset(offset);

      const countResult = status
        ? await db
            .select({ count: sql<number>`count(*)` })
            .from(schema.projects)
            .where(eq(schema.projects.status, status))
        : await db.select({ count: sql<number>`count(*)` }).from(schema.projects);

      return reply.send({
        items,
        total: countResult[0]?.count ?? 0,
        limit,
        offset,
      });
    }
  );

  // GET /projects/:id
  app.get(
    "/projects/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const items = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, parseResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return reply.status(404).send({ error: "Project not found" });
      }

      return reply.send(items[0]);
    }
  );

  // PATCH /projects/:id
  app.patch(
    "/projects/:id",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamsSchema>;
        Body: z.infer<typeof ProjectUpdateSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const bodyResult = ProjectUpdateSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const updates = { ...bodyResult.data, updatedAt: new Date() };

      const result = await db
        .update(schema.projects)
        .set(updates)
        .where(eq(schema.projects.id, paramsResult.data.id))
        .returning();

      if (result.length === 0) {
        return reply.status(404).send({ error: "Project not found" });
      }

      return reply.send(result[0]);
    }
  );

  // DELETE /projects/:id
  app.delete(
    "/projects/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const result = await db
        .delete(schema.projects)
        .where(eq(schema.projects.id, parseResult.data.id))
        .returning();

      if (result.length === 0) {
        return reply.status(404).send({ error: "Project not found" });
      }

      return reply.status(204).send();
    }
  );

  // POST /projects/:id/interpret - Natural language edit
  app.post(
    "/projects/:id/interpret",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamsSchema>;
        Body: z.infer<typeof NaturalLanguageEditSchema>;
      }>,
      reply: FastifyReply
    ) => {
      if (!hasLLMProvider()) {
        return reply.status(503).send({
          error: "Service unavailable",
          message: "LLM provider not configured",
        });
      }

      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const bodyResult = NaturalLanguageEditSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const items = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, paramsResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return reply.status(404).send({ error: "Project not found" });
      }

      const project = items[0];
      const provider = getLLMProvider();

      const interpretation = await provider.interpretCorrection(
        {
          name: project.name,
          desiredOutcome: project.desiredOutcome,
          nextAction: project.nextAction,
          status: project.status,
        },
        bodyResult.data.instruction
      );

      const updateResult = ProjectUpdateSchema.safeParse(interpretation.updates);
      if (!updateResult.success) {
        return reply.status(400).send({
          error: "AI interpretation produced invalid updates",
          details: updateResult.error.flatten().fieldErrors,
          interpretation,
        });
      }

      const updates = { ...updateResult.data, updatedAt: new Date() };

      const result = await db
        .update(schema.projects)
        .set(updates)
        .where(eq(schema.projects.id, paramsResult.data.id))
        .returning();

      return reply.send({
        entity: result[0],
        interpretation: {
          updates: interpretation.updates,
          reasoning: interpretation.reasoning,
        },
      });
    }
  );
}

// =============================================================================
// Idea Routes
// =============================================================================

async function ideaRoutes(app: FastifyInstance): Promise<void> {
  // GET /ideas - List ideas
  app.get(
    "/ideas",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof IdeaQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdeaQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { limit, offset, sort } = parseResult.data;

      const items = await db
        .select()
        .from(schema.ideas)
        .orderBy(getSortOrder(sort, schema.ideas))
        .limit(limit)
        .offset(offset);

      const countResult = await db.select({ count: sql<number>`count(*)` }).from(schema.ideas);

      return reply.send({
        items,
        total: countResult[0]?.count ?? 0,
        limit,
        offset,
      });
    }
  );

  // GET /ideas/:id
  app.get(
    "/ideas/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const items = await db
        .select()
        .from(schema.ideas)
        .where(eq(schema.ideas.id, parseResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return reply.status(404).send({ error: "Idea not found" });
      }

      return reply.send(items[0]);
    }
  );

  // PATCH /ideas/:id
  app.patch(
    "/ideas/:id",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamsSchema>;
        Body: z.infer<typeof IdeaUpdateSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const bodyResult = IdeaUpdateSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const updates = { ...bodyResult.data, updatedAt: new Date() };

      const result = await db
        .update(schema.ideas)
        .set(updates)
        .where(eq(schema.ideas.id, paramsResult.data.id))
        .returning();

      if (result.length === 0) {
        return reply.status(404).send({ error: "Idea not found" });
      }

      return reply.send(result[0]);
    }
  );

  // DELETE /ideas/:id
  app.delete(
    "/ideas/:id",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = IdParamsSchema.safeParse(request.params);
      if (!parseResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const result = await db
        .delete(schema.ideas)
        .where(eq(schema.ideas.id, parseResult.data.id))
        .returning();

      if (result.length === 0) {
        return reply.status(404).send({ error: "Idea not found" });
      }

      return reply.status(204).send();
    }
  );

  // POST /ideas/:id/interpret - Natural language edit
  app.post(
    "/ideas/:id/interpret",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof IdParamsSchema>;
        Body: z.infer<typeof NaturalLanguageEditSchema>;
      }>,
      reply: FastifyReply
    ) => {
      if (!hasLLMProvider()) {
        return reply.status(503).send({
          error: "Service unavailable",
          message: "LLM provider not configured",
        });
      }

      const paramsResult = IdParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({ error: "Invalid ID format" });
      }

      const bodyResult = NaturalLanguageEditSchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const items = await db
        .select()
        .from(schema.ideas)
        .where(eq(schema.ideas.id, paramsResult.data.id))
        .limit(1);

      if (items.length === 0) {
        return reply.status(404).send({ error: "Idea not found" });
      }

      const idea = items[0];
      const provider = getLLMProvider();

      const interpretation = await provider.interpretCorrection(
        {
          title: idea.title,
          summary: idea.summary,
          links: idea.links,
        },
        bodyResult.data.instruction
      );

      const updateResult = IdeaUpdateSchema.safeParse(interpretation.updates);
      if (!updateResult.success) {
        return reply.status(400).send({
          error: "AI interpretation produced invalid updates",
          details: updateResult.error.flatten().fieldErrors,
          interpretation,
        });
      }

      const updates = { ...updateResult.data, updatedAt: new Date() };

      const result = await db
        .update(schema.ideas)
        .set(updates)
        .where(eq(schema.ideas.id, paramsResult.data.id))
        .returning();

      return reply.send({
        entity: result[0],
        interpretation: {
          updates: interpretation.updates,
          reasoning: interpretation.reasoning,
        },
      });
    }
  );
}

// =============================================================================
// Fix/Correction Routes (Cross-Entity)
// =============================================================================

const FixBodySchema = z.object({
  correction: z.string().min(1).max(500),
});

const FixParamsSchema = z.object({
  entityType: z.enum(["tasks", "projects", "ideas"]),
  id: z.string().uuid(),
});

async function fixRoutes(app: FastifyInstance): Promise<void> {
  // POST /fix/:entityType/:id - Fix/correct an entity (may transform type)
  app.post(
    "/fix/:entityType/:id",
    async (
      request: FastifyRequest<{
        Params: z.infer<typeof FixParamsSchema>;
        Body: z.infer<typeof FixBodySchema>;
      }>,
      reply: FastifyReply
    ) => {
      if (!hasLLMProvider()) {
        return reply.status(503).send({
          error: "Service unavailable",
          message: "LLM provider not configured",
        });
      }

      const paramsResult = FixParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: paramsResult.error.flatten().fieldErrors,
        });
      }

      const bodyResult = FixBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: bodyResult.error.flatten().fieldErrors,
        });
      }

      const { entityType, id } = paramsResult.data;
      const { correction } = bodyResult.data;

      // Map plural entity type to singular and table
      const entityTypeMap = {
        tasks: { singular: "task" as const, table: schema.tasks },
        projects: { singular: "project" as const, table: schema.projects },
        ideas: { singular: "idea" as const, table: schema.ideas },
      };

      const { singular: singularType, table } = entityTypeMap[entityType];

      // Fetch the original entity
      const items = await db.select().from(table).where(eq(table.id, id)).limit(1);

      if (items.length === 0) {
        return reply.status(404).send({ error: `${singularType} not found` });
      }

      const oldEntity = items[0];
      const provider = getLLMProvider();

      // Interpret the fix
      const fixResult = await provider.interpretFix(singularType, oldEntity, correction);

      const now = new Date();
      const newReceiptId = randomUUID();

      // Find the previous receipt (if exists)
      const previousReceipts = oldEntity.sourceInboxItemId
        ? await db
            .select()
            .from(schema.receipts)
            .where(eq(schema.receipts.inboxItemId, oldEntity.sourceInboxItemId))
            .orderBy(desc(schema.receipts.timestamp))
            .limit(1)
        : [];

      const previousReceiptId = previousReceipts[0]?.id || null;

      if (fixResult.shouldTransform && fixResult.newType) {
        // Type transformation - create new entity and mark old as completed
        const newEntityId = randomUUID();
        let newEntity: Record<string, unknown>;

        // Create the new entity based on type
        switch (fixResult.newType) {
          case "task": {
            const taskData = {
              id: newEntityId,
              title: (fixResult.fields.title as string) || "Untitled",
              nextAction: (fixResult.fields.nextAction as string) || "",
              dueDate: fixResult.fields.dueDate ? new Date(fixResult.fields.dueDate as string) : null,
              context: (fixResult.fields.context as string | null) || null,
              status: (fixResult.fields.status as "active" | "completed" | "waiting" | "someday") || "active",
              sourceInboxItemId: oldEntity.sourceInboxItemId || null,
              createdAt: now,
              updatedAt: now,
            };
            await db.insert(schema.tasks).values(taskData);
            newEntity = taskData;
            break;
          }

          case "project": {
            const projectData = {
              id: newEntityId,
              name: (fixResult.fields.name as string) || "Untitled",
              desiredOutcome: (fixResult.fields.desiredOutcome as string | null) || null,
              nextAction: (fixResult.fields.nextAction as string | null) || null,
              status: (fixResult.fields.status as "active" | "completed" | "on_hold" | "someday") || "active",
              sourceInboxItemId: oldEntity.sourceInboxItemId || null,
              createdAt: now,
              updatedAt: now,
            };
            await db.insert(schema.projects).values(projectData);
            newEntity = projectData;
            break;
          }

          case "idea": {
            const ideaData = {
              id: newEntityId,
              title: (fixResult.fields.title as string) || "Untitled",
              summary: (fixResult.fields.summary as string | null) || null,
              links: (fixResult.fields.links as string[]) || [],
              sourceInboxItemId: oldEntity.sourceInboxItemId || null,
              createdAt: now,
              updatedAt: now,
            };
            await db.insert(schema.ideas).values(ideaData);
            newEntity = ideaData;
            break;
          }

          default:
            return reply.status(400).send({
              error: "Invalid transformation target type",
              details: { newType: fixResult.newType },
            });
        }

        // Mark old entity as completed (or delete it)
        // For now, we'll mark it as completed if the type supports it
        if (singularType === "task" || singularType === "project") {
          await db
            .update(table)
            .set({ status: "completed", updatedAt: now })
            .where(eq(table.id, id));
        }

        // Create receipt
        const receipt = {
          id: newReceiptId,
          inboxItemId: oldEntity.sourceInboxItemId || randomUUID(),
          classification: fixResult.newType,
          extractedFields: fixResult.fields,
          confidenceScore: 1.0,
          modelUsed: provider.model,
          timestamp: now,
          writes: [
            {
              entityType: singularType,
              entityId: id,
              action: "update" as const,
            },
            {
              entityType: fixResult.newType,
              entityId: newEntityId,
              action: "create" as const,
            },
          ],
          previousReceiptId,
          personalContextUsed: [],
        };

        await db.insert(schema.receipts).values(receipt);

        return reply.send({
          oldEntity,
          newEntity,
          receipt,
          reasoning: fixResult.reasoning,
        });
      } else {
        // No transformation - just update fields
        const updates = { ...fixResult.fields, updatedAt: now };

        const result = await db.update(table).set(updates).where(eq(table.id, id)).returning();

        // Create receipt
        const receipt = {
          id: newReceiptId,
          inboxItemId: oldEntity.sourceInboxItemId || randomUUID(),
          classification: singularType,
          extractedFields: fixResult.fields,
          confidenceScore: 1.0,
          modelUsed: provider.model,
          timestamp: now,
          writes: [
            {
              entityType: singularType,
              entityId: id,
              action: "update" as const,
            },
          ],
          previousReceiptId,
          personalContextUsed: [],
        };

        await db.insert(schema.receipts).values(receipt);

        return reply.send({
          oldEntity,
          newEntity: result[0],
          receipt,
          reasoning: fixResult.reasoning,
        });
      }
    }
  );
}

// =============================================================================
// Main Export
// =============================================================================

export async function entityRoutes(app: FastifyInstance): Promise<void> {
  await taskRoutes(app);
  await projectRoutes(app);
  await ideaRoutes(app);
  await fixRoutes(app);
}
