import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, sql, desc, isNull, and, lt, gte, or } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { sendData, sendValidationError } from "../utils/response.js";

// =============================================================================
// Request Schemas
// =============================================================================

const DigestQuerySchema = z.object({
  context: z.enum(["all", "work", "personal"]).optional().default("all"),
  maxItems: z.coerce.number().min(1).max(20).optional().default(8),
  staleDays: z.coerce.number().min(1).max(365).optional().default(7),
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
        return sendValidationError(
          reply,
          "Validation failed",
          parseResult.error.flatten().fieldErrors
        );
      }

      const { context, maxItems, staleDays } = parseResult.data;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get active tasks, prioritized by due date and creation date
      // Push filtering, sorting, and limiting to SQL to avoid O(n) memory usage
      const contextFilter = context === "all"
        ? eq(schema.tasks.status, "active")
        : and(
            eq(schema.tasks.status, "active"),
            or(
              isNull(schema.tasks.context),
              sql`LOWER(${schema.tasks.context}) LIKE ${'%' + context + '%'}`
            )
          );

      const topTasks = await db
        .select()
        .from(schema.tasks)
        .where(contextFilter)
        .orderBy(
          // Tasks with due dates first (nulls last), then by due date ascending, then created date
          sql`CASE WHEN ${schema.tasks.dueDate} IS NULL THEN 1 ELSE 0 END`,
          schema.tasks.dueDate,
          schema.tasks.createdAt
        )
        .limit(maxItems);

      // Get flagged receipts (confidence between 0.5 and 0.8)
      // Exclude items that are blocked awaiting clarification - those appear in pendingClarifications
      const flaggedReceipts = await db
        .select({
          id: schema.receipts.id,
          inboxItemId: schema.receipts.inboxItemId,
          classification: schema.receipts.classification,
          extractedFields: schema.receipts.extractedFields,
          confidenceScore: schema.receipts.confidenceScore,
          modelUsed: schema.receipts.modelUsed,
          timestamp: schema.receipts.timestamp,
          writes: schema.receipts.writes,
          previousReceiptId: schema.receipts.previousReceiptId,
          personalContextUsed: schema.receipts.personalContextUsed,
        })
        .from(schema.receipts)
        .leftJoin(schema.inboxItems, eq(schema.receipts.inboxItemId, schema.inboxItems.id))
        .where(
          and(
            sql`${schema.receipts.confidenceScore} >= 0.5`,
            sql`${schema.receipts.confidenceScore} < 0.8`,
            // Exclude items awaiting clarification (status='blocked')
            or(
              isNull(schema.inboxItems.status),
              sql`${schema.inboxItems.status} != 'blocked'`
            )
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

      // Get stale tasks (no updates in staleDays days)
      const staleThreshold = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);
      const staleTasks = await db
        .select()
        .from(schema.tasks)
        .where(
          and(
            eq(schema.tasks.status, "active"),
            lt(schema.tasks.updatedAt, staleThreshold)
          )
        )
        .orderBy(schema.tasks.updatedAt)
        .limit(10);

      // Get projects without next actions
      const projectsWithoutNextAction = await db
        .select()
        .from(schema.projects)
        .where(
          and(
            eq(schema.projects.status, "active"),
            isNull(schema.projects.nextAction)
          )
        )
        .orderBy(desc(schema.projects.updatedAt))
        .limit(10);

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

      // Get new undescribed contexts (learned in last 24 hours)
      // Push date filter to SQL to avoid loading all undescribed contexts
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentNewContexts = await db
        .select()
        .from(schema.personalContexts)
        .where(
          and(
            isNull(schema.personalContexts.description),
            gte(schema.personalContexts.createdAt, yesterday)
          )
        )
        .orderBy(desc(schema.personalContexts.createdAt))
        .limit(20);

      return sendData(
        reply,
        {
          date: new Date().toISOString().split("T")[0],
          context,
          nextActions: topTasks,
          flaggedItems: flaggedReceipts,
          pendingClarifications,
          staleTasks,
          projectsWithoutNextAction,
          newContexts: recentNewContexts.map((ctx) => ({
            id: ctx.id,
            name: ctx.name,
            type: ctx.type,
            domain: ctx.domain,
            mentionCount: ctx.mentionCount,
          })),
          stats: {
            activeTasks: taskCount[0]?.count ?? 0,
            activeProjects: projectCount[0]?.count ?? 0,
            ideas: ideaCount[0]?.count ?? 0,
          },
        }
      );
    }
  );

  /**
   * GET /digest/weekly - Get weekly review
   */
  app.get("/digest/weekly", async (_request: FastifyRequest, reply: FastifyReply) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Get open loops (active tasks without due dates or overdue)
    // Limit results to prevent memory issues with large datasets
    const now = new Date();
    const openLoops = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.status, "active"),
          or(isNull(schema.tasks.dueDate), lt(schema.tasks.dueDate, now))
        )
      )
      .orderBy(schema.tasks.createdAt)
      .limit(100);

    // Get stale projects (not updated in 14+ days)
    const staleProjects = await db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.status, "active"),
          lt(schema.projects.updatedAt, twoWeeksAgo)
        )
      )
      .orderBy(schema.projects.updatedAt)
      .limit(20);

    // Get personal context questions (5+ mentions, no description)
    const contextQuestions = await db
      .select()
      .from(schema.personalContexts)
      .where(
        and(
          isNull(schema.personalContexts.description),
          sql`${schema.personalContexts.mentionCount} >= 5`
        )
      )
      .orderBy(desc(schema.personalContexts.mentionCount))
      .limit(10);

    const questions = contextQuestions.map((ctx) => {
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

    // Get completed items (wins) from last week
    const completedTasks = await db
      .select()
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.status, "completed"),
          gte(schema.tasks.updatedAt, weekAgo)
        )
      )
      .orderBy(desc(schema.tasks.updatedAt))
      .limit(50);

    const completedProjects = await db
      .select()
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.status, "completed"),
          gte(schema.projects.updatedAt, weekAgo)
        )
      )
      .orderBy(desc(schema.projects.updatedAt))
      .limit(20);

    // Analyze task distribution for suggested areas of focus
    // Use SQL GROUP BY to avoid loading all tasks into memory
    const contextDistribution = await db
      .select({
        context: sql<string>`COALESCE(${schema.tasks.context}, 'uncategorized')`.as('context'),
        count: sql<number>`count(*)`.as('count'),
      })
      .from(schema.tasks)
      .where(eq(schema.tasks.status, "active"))
      .groupBy(sql`COALESCE(${schema.tasks.context}, 'uncategorized')`)
      .orderBy(desc(sql`count(*)`))
      .limit(5);

    // Count long-standing tasks with SQL instead of loading all tasks
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const longStandingCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.tasks)
      .where(
        and(
          eq(schema.tasks.status, "active"),
          lt(schema.tasks.createdAt, thirtyDaysAgo)
        )
      );

    const suggestedFocus = contextDistribution.map(({ context, count }) => ({
      context,
      taskCount: count,
      suggestion: count > 10
        ? `High volume in ${context} (${count} tasks) - consider breaking down or prioritizing`
        : `${context} has ${count} active tasks`,
    }));

    // Add suggestion for long-standing tasks
    const longStandingTaskCount = longStandingCount[0]?.count ?? 0;
    if (longStandingTaskCount > 5) {
      suggestedFocus.push({
        context: "long-standing",
        taskCount: longStandingTaskCount,
        suggestion: `${longStandingTaskCount} tasks have been active for 30+ days - review for relevance`,
      });
    }

    return sendData(reply, {
      weekStart: weekAgo.toISOString().split("T")[0],
      weekEnd: new Date().toISOString().split("T")[0],
      openLoops: {
        tasks: openLoops,
        total: openLoops.length,
      },
      staleProjects: {
        projects: staleProjects,
        total: staleProjects.length,
      },
      contextQuestions: {
        questions,
        total: questions.length,
      },
      wins: {
        completedTasks,
        completedProjects,
        totalTasks: completedTasks.length,
        totalProjects: completedProjects.length,
      },
      suggestedFocus,
    });
  });

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

    return sendData(reply, {
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
