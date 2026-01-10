import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, sql, desc, isNull, and } from "drizzle-orm";
import { db, schema } from "../db/index.js";

// =============================================================================
// Request Schemas
// =============================================================================

const DigestQuerySchema = z.object({
  context: z.enum(["all", "work", "personal"]).optional().default("all"),
  maxItems: z.coerce.number().min(1).max(20).optional().default(8),
});

// =============================================================================
// Digest Routes
// =============================================================================

export async function digestRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /digest/daily - Get daily digest
   */
  app.get(
    "/digest/daily",
    async (
      request: FastifyRequest<{ Querystring: z.infer<typeof DigestQuerySchema> }>,
      reply: FastifyReply
    ) => {
      const parseResult = DigestQuerySchema.safeParse(request.query);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { context, maxItems } = parseResult.data;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get active tasks, prioritized by due date and creation date
      // For "work" or "personal" context, filter by context field
      let tasksQuery = db
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.status, "active"));

      const allActiveTasks = await tasksQuery;

      // Filter by context if specified
      let filteredTasks = allActiveTasks;
      if (context !== "all") {
        filteredTasks = allActiveTasks.filter((task) => {
          if (!task.context) return true; // Include tasks without context
          const taskContext = task.context.toLowerCase();
          return taskContext.includes(context);
        });
      }

      // Sort tasks: due date (ascending, nulls last), then by creation date
      const sortedTasks = filteredTasks.sort((a, b) => {
        // Tasks with due dates come first
        if (a.dueDate && !b.dueDate) return -1;
        if (!a.dueDate && b.dueDate) return 1;
        if (a.dueDate && b.dueDate) {
          const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          if (diff !== 0) return diff;
        }
        // Then by creation date (older first)
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Take top tasks based on maxItems
      const topTasks = sortedTasks.slice(0, maxItems);

      // Get flagged receipts (confidence between 0.5 and 0.8)
      const flaggedReceipts = await db
        .select()
        .from(schema.receipts)
        .where(
          and(
            sql`${schema.receipts.confidenceScore} >= 0.5`,
            sql`${schema.receipts.confidenceScore} < 0.8`
          )
        )
        .orderBy(desc(schema.receipts.timestamp))
        .limit(5);

      // Get pending clarifications
      const pendingClarifications = await db
        .select()
        .from(schema.clarifications)
        .where(isNull(schema.clarifications.resolvedAt))
        .orderBy(desc(schema.clarifications.createdAt))
        .limit(5);

      // Get stats
      const taskCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.tasks)
        .where(eq(schema.tasks.status, "active"));

      const projectCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(schema.projects)
        .where(eq(schema.projects.status, "active"));

      const ideaCount = await db.select({ count: sql<number>`count(*)` }).from(schema.ideas);

      return reply.send({
        date: new Date().toISOString().split("T")[0],
        context,
        nextActions: topTasks,
        flaggedItems: flaggedReceipts,
        pendingClarifications,
        stats: {
          activeTasks: taskCount[0]?.count ?? 0,
          activeProjects: projectCount[0]?.count ?? 0,
          ideas: ideaCount[0]?.count ?? 0,
        },
      });
    }
  );

  /**
   * GET /digest/summary - Quick stats summary
   */
  app.get("/digest/summary", async (_request: FastifyRequest, reply: FastifyReply) => {
    const [
      inboxCount,
      pendingProcessing,
      activeTasks,
      activeProjects,
      ideas,
      pendingClarifications,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.inboxItems)
        .where(eq(schema.inboxItems.status, "new")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.inboxItems)
        .where(eq(schema.inboxItems.status, "blocked")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.tasks)
        .where(eq(schema.tasks.status, "active")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.projects)
        .where(eq(schema.projects.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(schema.ideas),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.clarifications)
        .where(isNull(schema.clarifications.resolvedAt)),
    ]);

    return reply.send({
      inbox: {
        new: inboxCount[0]?.count ?? 0,
        needsClarification: pendingProcessing[0]?.count ?? 0,
      },
      entities: {
        activeTasks: activeTasks[0]?.count ?? 0,
        activeProjects: activeProjects[0]?.count ?? 0,
        ideas: ideas[0]?.count ?? 0,
      },
      pendingClarifications: pendingClarifications[0]?.count ?? 0,
    });
  });
}
