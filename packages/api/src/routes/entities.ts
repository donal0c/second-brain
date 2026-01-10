import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, sql, desc, asc, like } from "drizzle-orm";
import { db, schema } from "../db/index.js";

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
}

// =============================================================================
// Main Export
// =============================================================================

export async function entityRoutes(app: FastifyInstance): Promise<void> {
  await taskRoutes(app);
  await projectRoutes(app);
  await ideaRoutes(app);
}
