import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "crypto";
import { z } from "zod";
import { eq, sql, desc, asc, like, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { generateEntityEmbedding, hasOpenAIClient } from "../services/embedding.js";
import { getLLMProvider, hasLLMProvider } from "../llm/index.js";
import {
  sendData,
  sendList,
  sendNotFound,
  sendValidationError,
  sendBadRequest,
  sendServiceUnavailable,
  sendNoContent,
} from "../utils/response.js";

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
  needsReview: z.coerce.boolean().optional(),
});

const TaskUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  nextAction: z.string().min(1).optional(),
  dueDate: z.coerce.date().nullable().optional(),
  context: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "waiting", "someday"]).optional(),
  needsReview: z.boolean().optional(),
});

const TaskCreateSchema = z.object({
  title: z.string().min(1),
  nextAction: z.string().min(1),
  dueDate: z.coerce.date().nullable().optional(),
  context: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "waiting", "someday"]).optional().default("active"),
  needsReview: z.boolean().optional().default(false),
});

// =============================================================================
// Project Schemas
// =============================================================================

const ProjectQuerySchema = PaginationSchema.extend({
  status: z.enum(["active", "completed", "on_hold", "someday"]).optional(),
  needsReview: z.coerce.boolean().optional(),
});

const ProjectUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  desiredOutcome: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "on_hold", "someday"]).optional(),
  needsReview: z.boolean().optional(),
});

const ProjectCreateSchema = z.object({
  name: z.string().min(1),
  desiredOutcome: z.string().nullable().optional(),
  nextAction: z.string().nullable().optional(),
  status: z.enum(["active", "completed", "on_hold", "someday"]).optional().default("active"),
  needsReview: z.boolean().optional().default(false),
});

// =============================================================================
// Idea Schemas
// =============================================================================

const IdeaQuerySchema = PaginationSchema.extend({
  needsReview: z.coerce.boolean().optional(),
});

const IdeaUpdateSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().nullable().optional(),
  links: z.array(z.string().url()).optional(),
  needsReview: z.boolean().optional(),
});

const IdeaCreateSchema = z.object({
  title: z.string().min(1),
  summary: z.string().nullable().optional(),
  links: z.array(z.string().url()).optional().default([]),
  needsReview: z.boolean().optional().default(false),
});

// =============================================================================
// Person Schemas
// =============================================================================

const PersonQuerySchema = PaginationSchema.extend({
  needsReview: z.coerce.boolean().optional(),
});

const PersonUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  relationshipContext: z.string().nullable().optional(),
  lastTouchedAt: z.coerce.date().nullable().optional(),
  followUpNextAction: z.string().nullable().optional(),
  needsReview: z.boolean().optional(),
});

const PersonCreateSchema = z.object({
  name: z.string().min(1),
  relationshipContext: z.string().nullable().optional(),
  lastTouchedAt: z.coerce.date().nullable().optional(),
  followUpNextAction: z.string().nullable().optional(),
  needsReview: z.boolean().optional().default(false),
});

// =============================================================================
// Helper Functions
// =============================================================================

function getSortOrder(sort: string, table: typeof schema.tasks | typeof schema.projects | typeof schema.ideas | typeof schema.persons) {
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

const EMBEDDED_FIELDS: Record<string, string[]> = {
  task: ["title", "nextAction", "context"],
  project: ["name", "desiredOutcome", "nextAction"],
  idea: ["title", "summary"],
  person: ["name", "relationshipContext", "followUpNextAction"],
};

export function hasEmbeddedFieldChange(
  entityName: string,
  updates: Record<string, unknown>
): boolean {
  const key = entityName.toLowerCase() as keyof typeof EMBEDDED_FIELDS;
  const fields = EMBEDDED_FIELDS[key];
  if (!fields) return false;
  return fields.some((field) => field in updates);
}

async function updateEmbeddingForEntity(
  entityName: "task" | "project" | "idea" | "person",
  entity: Record<string, unknown>,
  table: typeof schema.tasks | typeof schema.projects | typeof schema.ideas | typeof schema.persons
): Promise<void> {
  if (!hasOpenAIClient()) return;

  try {
    const embedding = await generateEntityEmbedding({
      type: entityName,
      data: entity,
    });

    await db
      .update(table)
      .set({ embedding })
      .where(eq(table.id, entity.id as string));
  } catch (error) {
    console.error(`[EMBEDDING] Failed to re-embed ${entityName} ${(entity as any).id}:`, error);
  }
}

type EmbeddableEntityName = "task" | "project" | "idea" | "person";
type EmbeddableTable =
  | typeof schema.tasks
  | typeof schema.projects
  | typeof schema.ideas
  | typeof schema.persons;

export function fireAndForgetEmbeddingOnCreate({
  entityName,
  entity,
  table,
  hasClient = hasOpenAIClient(),
  embedFn = updateEmbeddingForEntity,
}: {
  entityName: EmbeddableEntityName;
  entity: Record<string, unknown>;
  table: EmbeddableTable;
  hasClient?: boolean;
  embedFn?: (
    name: EmbeddableEntityName,
    data: Record<string, unknown>,
    entityTable: EmbeddableTable
  ) => Promise<void>;
}): void {
  if (!hasClient) return;
  void embedFn(entityName, entity, table);
}

// =============================================================================
// Generic Entity Route Factory
// =============================================================================

interface EntityRouteConfig<TEntity, TQuerySchema, TUpdateSchema, TCreateSchema> {
  entityName: string; // "task", "project", "idea", "person"
  entityNamePlural: string; // "tasks", "projects", "ideas", "persons"
  table: typeof schema.tasks | typeof schema.projects | typeof schema.ideas | typeof schema.persons;
  querySchema: z.ZodType<TQuerySchema, z.ZodTypeDef, unknown>;
  updateSchema: z.ZodType<TUpdateSchema, z.ZodTypeDef, unknown>;
  createSchema: z.ZodType<TCreateSchema, z.ZodTypeDef, unknown>;
  extractFieldsForLLM: (entity: TEntity) => Record<string, unknown>;
  buildListFilters?: (query: TQuerySchema) => Array<ReturnType<typeof eq | typeof like>>;
}

function createEntityRoutes<TEntity extends Record<string, unknown>, TQuerySchema, TUpdateSchema, TCreateSchema>(
  config: EntityRouteConfig<TEntity, TQuerySchema, TUpdateSchema, TCreateSchema>
) {
  return async (app: FastifyInstance): Promise<void> => {
    const {
      entityName,
      entityNamePlural,
      table,
      querySchema,
      updateSchema,
      createSchema,
      extractFieldsForLLM,
      buildListFilters,
    } = config;

    // GET /:entity - List entities
    app.get(
      `/${entityNamePlural}`,
      async (request: FastifyRequest<{ Querystring: TQuerySchema }>, reply: FastifyReply) => {
        const parseResult = querySchema.safeParse(request.query);
        if (!parseResult.success) {
          return sendValidationError(
            reply,
            "Validation failed",
            parseResult.error.flatten().fieldErrors
          );
        }

        const query = parseResult.data as TQuerySchema & { limit: number; offset: number; sort: string };
        const { limit, offset, sort } = query;

        // Build conditions
        const conditions = buildListFilters ? buildListFilters(query) : [];

        // Execute query
        const items =
          conditions.length > 0
            ? await db
                .select()
                .from(table)
                .where(sql`${conditions.map((c) => sql`${c}`).reduce((a, b) => sql`${a} AND ${b}`)}`)
                .orderBy(getSortOrder(sort, table))
                .limit(limit)
                .offset(offset)
            : await db.select().from(table).orderBy(getSortOrder(sort, table)).limit(limit).offset(offset);

        // Get total count
        const countResult =
          conditions.length > 0
            ? await db
                .select({ count: sql<number>`count(*)` })
                .from(table)
                .where(sql`${conditions.map((c) => sql`${c}`).reduce((a, b) => sql`${a} AND ${b}`)}`)
            : await db.select({ count: sql<number>`count(*)` }).from(table);

        return sendList(reply, items, {
          total: countResult[0]?.count ?? 0,
          limit,
          offset,
        });
      }
    );

    // POST /:entity - Create entity
    app.post(
      `/${entityNamePlural}`,
      async (
        request: FastifyRequest<{ Body: TCreateSchema }>,
        reply: FastifyReply
      ) => {
        const bodyResult = createSchema.safeParse(request.body);
        if (!bodyResult.success) {
          return sendValidationError(
            reply,
            "Validation failed",
            bodyResult.error.flatten().fieldErrors
          );
        }

        const now = new Date();
        const newId = randomUUID();

        const newEntity = {
          id: newId,
          ...bodyResult.data,
          createdAt: now,
          updatedAt: now,
        };

        const result = await db.insert(table).values(newEntity).returning();
        const createdEntity = result[0];

        fireAndForgetEmbeddingOnCreate({
          entityName: entityName.toLowerCase() as EmbeddableEntityName,
          entity: createdEntity as Record<string, unknown>,
          table,
        });

        return reply.status(201).send({
          data: createdEntity,
        });
      }
    );

    // GET /:entity/:id - Get single entity
    app.get(
      `/${entityNamePlural}/:id`,
      async (request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>, reply: FastifyReply) => {
        const parseResult = IdParamsSchema.safeParse(request.params);
        if (!parseResult.success) {
          return sendBadRequest(reply, "Invalid ID format");
        }

        const items = await db.select().from(table).where(eq(table.id, parseResult.data.id)).limit(1);

        if (items.length === 0) {
          return sendNotFound(reply, entityName);
        }

        return sendData(reply, items[0]);
      }
    );

    // PATCH /:entity/:id - Update entity
    app.patch(
      `/${entityNamePlural}/:id`,
      async (
        request: FastifyRequest<{
          Params: z.infer<typeof IdParamsSchema>;
          Body: TUpdateSchema;
        }>,
        reply: FastifyReply
      ) => {
        const paramsResult = IdParamsSchema.safeParse(request.params);
        if (!paramsResult.success) {
          return sendBadRequest(reply, "Invalid ID format");
        }

        const bodyResult = updateSchema.safeParse(request.body);
        if (!bodyResult.success) {
          return sendValidationError(
            reply,
            "Validation failed",
            bodyResult.error.flatten().fieldErrors
          );
        }

        const updates = { ...bodyResult.data, updatedAt: new Date() };

        const result = await db
          .update(table)
          .set(updates)
          .where(eq(table.id, paramsResult.data.id))
          .returning();

        if (result.length === 0) {
          return sendNotFound(reply, entityName);
        }

        if (
          hasEmbeddedFieldChange(entityName, bodyResult.data as Record<string, unknown>)
        ) {
          void updateEmbeddingForEntity(
            entityName.toLowerCase() as "task" | "project" | "idea" | "person",
            result[0] as Record<string, unknown>,
            table
          );
        }

        return sendData(reply, result[0]);
      }
    );

    // DELETE /:entity/:id - Delete entity
    app.delete(
      `/${entityNamePlural}/:id`,
      async (request: FastifyRequest<{ Params: z.infer<typeof IdParamsSchema> }>, reply: FastifyReply) => {
        const parseResult = IdParamsSchema.safeParse(request.params);
        if (!parseResult.success) {
          return sendBadRequest(reply, "Invalid ID format");
        }

        // Clean up any nudges referencing this entity (tasks, projects, persons only)
        const nudgeEntityType = entityName.toLowerCase() as "task" | "project" | "person";
        if (nudgeEntityType === "task" || nudgeEntityType === "project" || nudgeEntityType === "person") {
          await db
            .delete(schema.nudges)
            .where(
              and(
                eq(schema.nudges.entityType, nudgeEntityType),
                eq(schema.nudges.entityId, parseResult.data.id)
              )
            );
        }

        const result = await db
          .delete(table)
          .where(eq(table.id, parseResult.data.id))
          .returning();

        if (result.length === 0) {
          return sendNotFound(reply, entityName);
        }

        return sendNoContent(reply);
      }
    );

    // POST /:entity/:id/interpret - Natural language edit
    app.post(
      `/${entityNamePlural}/:id/interpret`,
      async (
        request: FastifyRequest<{
          Params: z.infer<typeof IdParamsSchema>;
          Body: z.infer<typeof NaturalLanguageEditSchema>;
        }>,
        reply: FastifyReply
      ) => {
        if (!hasLLMProvider()) {
          return sendServiceUnavailable(reply, "LLM provider not configured");
        }

        const paramsResult = IdParamsSchema.safeParse(request.params);
        if (!paramsResult.success) {
          return sendBadRequest(reply, "Invalid ID format");
        }

        const bodyResult = NaturalLanguageEditSchema.safeParse(request.body);
        if (!bodyResult.success) {
          return sendValidationError(
            reply,
            "Validation failed",
            bodyResult.error.flatten().fieldErrors
          );
        }

        // Fetch existing entity
        const items = await db.select().from(table).where(eq(table.id, paramsResult.data.id)).limit(1);

        if (items.length === 0) {
          return sendNotFound(reply, entityName);
        }

        const entity = items[0];
        const provider = getLLMProvider();

        // Interpret the natural language instruction
        const interpretation = await provider.interpretCorrection(
          extractFieldsForLLM(entity as unknown as TEntity),
          bodyResult.data.instruction
        );

        // Validate and apply updates
        const updateResult = updateSchema.safeParse(interpretation.updates);
        if (!updateResult.success) {
          return sendBadRequest(
            reply,
            "AI interpretation produced invalid updates",
            {
              validationErrors: updateResult.error.flatten().fieldErrors,
              interpretation,
            }
          );
        }

        const now = new Date();
        const updates = { ...updateResult.data, updatedAt: now };

        const result = await db
          .update(table)
          .set(updates)
          .where(eq(table.id, paramsResult.data.id))
          .returning();

        // Create receipt for audit trail
        const receiptId = randomUUID();

        // Find the previous receipt (if entity has a source inbox item)
        const previousReceipts = entity.sourceInboxItemId
          ? await db
              .select()
              .from(schema.receipts)
              .where(eq(schema.receipts.inboxItemId, entity.sourceInboxItemId))
              .orderBy(desc(schema.receipts.timestamp))
              .limit(1)
          : [];

        const previousReceiptId = previousReceipts[0]?.id || null;

        const receipt = {
          id: receiptId,
          inboxItemId: entity.sourceInboxItemId || null,
          classification: entityName.toLowerCase() as "task" | "project" | "idea",
          extractedFields: {
            instruction: bodyResult.data.instruction,
            appliedUpdates: interpretation.updates,
            reasoning: interpretation.reasoning,
          },
          confidenceScore: 1.0, // User-directed interpretation
          modelUsed: provider.model,
          timestamp: now,
          writes: [
            {
              entityType: entityName.toLowerCase() as "task" | "project" | "idea",
              entityId: paramsResult.data.id,
              action: "update" as const,
            },
          ],
          previousReceiptId,
          personalContextUsed: [],
          contextExtractionStatus: "skipped" as const, // User-directed, no context extraction needed
        };

        await db.insert(schema.receipts).values(receipt);

        return sendData(reply, {
          entity: result[0],
          interpretation: {
            updates: interpretation.updates,
            reasoning: interpretation.reasoning,
          },
          receipt,
        });
      }
    );
  };
}

// =============================================================================
// Task Routes
// =============================================================================

const taskRoutes = createEntityRoutes<
  {
    id: string;
    title: string;
    nextAction: string;
    dueDate: Date | null;
    context: string | null;
    status: string;
    needsReview: boolean;
    sourceInboxItemId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  z.infer<typeof TaskQuerySchema>,
  z.infer<typeof TaskUpdateSchema>,
  z.infer<typeof TaskCreateSchema>
>({
  entityName: "Task",
  entityNamePlural: "tasks",
  table: schema.tasks,
  querySchema: TaskQuerySchema,
  updateSchema: TaskUpdateSchema,
  createSchema: TaskCreateSchema,
  extractFieldsForLLM: (task) => ({
    title: task.title,
    nextAction: task.nextAction,
    dueDate: task.dueDate,
    context: task.context,
    status: task.status,
  }),
  buildListFilters: (query) => {
    const conditions = [];
    if (query.status) {
      conditions.push(eq(schema.tasks.status, query.status));
    }
    if (query.context) {
      conditions.push(like(schema.tasks.context, `%${query.context}%`));
    }
    if (query.needsReview !== undefined) {
      conditions.push(eq(schema.tasks.needsReview, query.needsReview));
    }
    return conditions;
  },
});

// =============================================================================
// Project Routes
// =============================================================================

const projectRoutes = createEntityRoutes<
  {
    id: string;
    name: string;
    desiredOutcome: string | null;
    nextAction: string | null;
    status: string;
    needsReview: boolean;
    sourceInboxItemId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  z.infer<typeof ProjectQuerySchema>,
  z.infer<typeof ProjectUpdateSchema>,
  z.infer<typeof ProjectCreateSchema>
>({
  entityName: "Project",
  entityNamePlural: "projects",
  table: schema.projects,
  querySchema: ProjectQuerySchema,
  updateSchema: ProjectUpdateSchema,
  createSchema: ProjectCreateSchema,
  extractFieldsForLLM: (project) => ({
    name: project.name,
    desiredOutcome: project.desiredOutcome,
    nextAction: project.nextAction,
    status: project.status,
  }),
  buildListFilters: (query) => {
    const conditions = [];
    if (query.status) {
      conditions.push(eq(schema.projects.status, query.status));
    }
    if (query.needsReview !== undefined) {
      conditions.push(eq(schema.projects.needsReview, query.needsReview));
    }
    return conditions;
  },
});

// =============================================================================
// Idea Routes
// =============================================================================

const ideaRoutes = createEntityRoutes<
  {
    id: string;
    title: string;
    summary: string | null;
    links: string[];
    needsReview: boolean;
    sourceInboxItemId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  z.infer<typeof IdeaQuerySchema>,
  z.infer<typeof IdeaUpdateSchema>,
  z.infer<typeof IdeaCreateSchema>
>({
  entityName: "Idea",
  entityNamePlural: "ideas",
  table: schema.ideas,
  querySchema: IdeaQuerySchema,
  updateSchema: IdeaUpdateSchema,
  createSchema: IdeaCreateSchema,
  extractFieldsForLLM: (idea) => ({
    title: idea.title,
    summary: idea.summary,
    links: idea.links,
  }),
  buildListFilters: (query) => {
    const conditions = [];
    if (query.needsReview !== undefined) {
      conditions.push(eq(schema.ideas.needsReview, query.needsReview));
    }
    return conditions;
  },
});

// =============================================================================
// Person Routes
// =============================================================================

const personRoutes = createEntityRoutes<
  {
    id: string;
    name: string;
    relationshipContext: string | null;
    lastTouchedAt: Date | null;
    followUpNextAction: string | null;
    needsReview: boolean;
    sourceInboxItemId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  z.infer<typeof PersonQuerySchema>,
  z.infer<typeof PersonUpdateSchema>,
  z.infer<typeof PersonCreateSchema>
>({
  entityName: "Person",
  entityNamePlural: "persons",
  table: schema.persons,
  querySchema: PersonQuerySchema,
  updateSchema: PersonUpdateSchema,
  createSchema: PersonCreateSchema,
  extractFieldsForLLM: (person) => ({
    name: person.name,
    relationshipContext: person.relationshipContext,
    lastTouchedAt: person.lastTouchedAt,
    followUpNextAction: person.followUpNextAction,
  }),
  buildListFilters: (query) => {
    const conditions = [];
    if (query.needsReview !== undefined) {
      conditions.push(eq(schema.persons.needsReview, query.needsReview));
    }
    return conditions;
  },
});

// =============================================================================
// Fix/Correction Routes (Cross-Entity)
// =============================================================================

const FixBodySchema = z.object({
  correction: z.string().min(1).max(500),
});

const FixParamsSchema = z.object({
  entityType: z.enum(["tasks", "projects", "ideas", "persons"]),
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
        return sendServiceUnavailable(reply, "LLM provider not configured. Set OPENAI_API_KEY (or ANTHROPIC_API_KEY) to enable processing.");
      }

      const paramsResult = FixParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          paramsResult.error.flatten().fieldErrors
        );
      }

      const bodyResult = FixBodySchema.safeParse(request.body);
      if (!bodyResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          bodyResult.error.flatten().fieldErrors
        );
      }

      const { entityType, id } = paramsResult.data;
      const { correction } = bodyResult.data;

      // Map plural entity type to singular and table
      const entityTypeMap = {
        tasks: { singular: "task" as const, table: schema.tasks },
        projects: { singular: "project" as const, table: schema.projects },
        ideas: { singular: "idea" as const, table: schema.ideas },
        persons: { singular: "person" as const, table: schema.persons },
      };

      const { singular: singularType, table } = entityTypeMap[entityType];

      // Fetch the original entity
      const items = await db.select().from(table).where(eq(table.id, id)).limit(1);

      if (items.length === 0) {
        return sendNotFound(reply, singularType);
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

          case "person": {
            const personData = {
              id: newEntityId,
              name: (fixResult.fields.name as string) || "Unknown",
              relationshipContext: (fixResult.fields.relationshipContext as string | null) || null,
              lastTouchedAt: fixResult.fields.lastTouchedAt ? new Date(fixResult.fields.lastTouchedAt as string) : null,
              followUpNextAction: (fixResult.fields.followUpNextAction as string | null) || null,
              sourceInboxItemId: oldEntity.sourceInboxItemId || null,
              createdAt: now,
              updatedAt: now,
            };
            await db.insert(schema.persons).values(personData);
            newEntity = personData;
            break;
          }

          default:
            return sendBadRequest(reply, "Invalid transformation target type", { newType: fixResult.newType });
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
          inboxItemId: oldEntity.sourceInboxItemId || null,
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
          contextExtractionStatus: "skipped" as const, // User-directed fix, no context extraction needed
        };

        await db.insert(schema.receipts).values(receipt);

        return sendData(reply, {
          oldEntity,
          newEntity,
          receipt,
          reasoning: fixResult.reasoning,
        });
      } else {
        // No transformation - just update fields
        // Map entity type to update schema for validation
        const updateSchemaMap = {
          task: TaskUpdateSchema,
          project: ProjectUpdateSchema,
          idea: IdeaUpdateSchema,
          person: PersonUpdateSchema,
        };

        const updateSchema = updateSchemaMap[singularType];
        const validationResult = updateSchema.safeParse(fixResult.fields);

        if (!validationResult.success) {
          return sendBadRequest(
            reply,
            "AI fix suggested invalid field updates",
            {
              validationErrors: validationResult.error.flatten().fieldErrors,
              suggestedFields: fixResult.fields,
            }
          );
        }

        const updates = { ...validationResult.data, updatedAt: now };

        const result = await db.update(table).set(updates).where(eq(table.id, id)).returning();

        // Create receipt
        const receipt = {
          id: newReceiptId,
          inboxItemId: oldEntity.sourceInboxItemId || null,
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
          contextExtractionStatus: "skipped" as const, // User-directed fix, no context extraction needed
        };

        await db.insert(schema.receipts).values(receipt);

        return sendData(reply, {
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
// Review Queue Routes
// =============================================================================

const ReviewQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(50),
});

async function reviewRoutes(app: FastifyInstance): Promise<void> {
  // GET /review - List all entities needing review across all types
  app.get(
    "/review",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof ReviewQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = ReviewQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          parseResult.error.flatten().fieldErrors
        );
      }

      const { limit } = parseResult.data;

      // Fetch entities needing review from all tables in parallel
      const [tasks, projects, ideas, persons] = await Promise.all([
        db
          .select()
          .from(schema.tasks)
          .where(eq(schema.tasks.needsReview, true))
          .orderBy(desc(schema.tasks.updatedAt))
          .limit(limit),
        db
          .select()
          .from(schema.projects)
          .where(eq(schema.projects.needsReview, true))
          .orderBy(desc(schema.projects.updatedAt))
          .limit(limit),
        db
          .select()
          .from(schema.ideas)
          .where(eq(schema.ideas.needsReview, true))
          .orderBy(desc(schema.ideas.updatedAt))
          .limit(limit),
        db
          .select()
          .from(schema.persons)
          .where(eq(schema.persons.needsReview, true))
          .orderBy(desc(schema.persons.updatedAt))
          .limit(limit),
      ]);

      // Count totals for each type
      const [taskCount, projectCount, ideaCount, personCount] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.tasks)
          .where(eq(schema.tasks.needsReview, true)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.projects)
          .where(eq(schema.projects.needsReview, true)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.ideas)
          .where(eq(schema.ideas.needsReview, true)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(schema.persons)
          .where(eq(schema.persons.needsReview, true)),
      ]);

      // Transform to unified format with entity type
      const reviewItems = [
        ...tasks.map((t) => ({ entityType: "task" as const, ...t })),
        ...projects.map((p) => ({ entityType: "project" as const, ...p })),
        ...ideas.map((i) => ({ entityType: "idea" as const, ...i })),
        ...persons.map((p) => ({ entityType: "person" as const, ...p })),
      ];

      // Sort by updatedAt descending and apply limit
      reviewItems.sort((a, b) => {
        const aTime = a.updatedAt?.getTime() ?? 0;
        const bTime = b.updatedAt?.getTime() ?? 0;
        return bTime - aTime;
      });

      const totalCount =
        (taskCount[0]?.count ?? 0) +
        (projectCount[0]?.count ?? 0) +
        (ideaCount[0]?.count ?? 0) +
        (personCount[0]?.count ?? 0);

      return reply.send({
        data: reviewItems.slice(0, limit),
        meta: {
          total: totalCount,
          byType: {
            tasks: taskCount[0]?.count ?? 0,
            projects: projectCount[0]?.count ?? 0,
            ideas: ideaCount[0]?.count ?? 0,
            persons: personCount[0]?.count ?? 0,
          },
          limit,
        },
      });
    }
  );

  // POST /review/:entityType/:id/approve - Mark an entity as reviewed
  app.post(
    "/review/:entityType/:id/approve",
    async (
      request: FastifyRequest<{ Params: z.infer<typeof FixParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const paramsResult = FixParamsSchema.safeParse(request.params);
      if (!paramsResult.success) {
        return sendValidationError(
          reply,
          "Validation failed",
          paramsResult.error.flatten().fieldErrors
        );
      }

      const { entityType, id } = paramsResult.data;

      // Map plural entity type to table
      const entityTypeMap = {
        tasks: schema.tasks,
        projects: schema.projects,
        ideas: schema.ideas,
        persons: schema.persons,
      };

      const table = entityTypeMap[entityType];

      const result = await db
        .update(table)
        .set({ needsReview: false, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning();

      if (result.length === 0) {
        return sendNotFound(reply, entityType.slice(0, -1)); // Remove 's' for singular
      }

      return sendData(reply, result[0]);
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
  await personRoutes(app);
  await fixRoutes(app);
  await reviewRoutes(app);
}
