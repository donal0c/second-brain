import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, sql, desc, isNull, and, lt, gte } from "drizzle-orm";
import { db, schema } from "../db/index.js";

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
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { context, maxItems, staleDays } = parseResult.data;
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
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const newContexts = await db
        .select()
        .from(schema.personalContexts)
        .where(isNull(schema.personalContexts.description))
        .orderBy(desc(schema.personalContexts.createdAt));

      // Filter to recent ones
      const recentNewContexts = newContexts.filter(
        (ctx) => ctx.createdAt >= yesterday
      );

      return reply.send({
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
      });
    }
  );

  /**
   * GET /digest/weekly - Get weekly review
   */
  app.get("/digest/weekly", async (_request: FastifyRequest, reply: FastifyReply) => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

    // Get open loops (active tasks without due dates or overdue)
    const openLoops = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.status, "active"))
      .orderBy(schema.tasks.createdAt);

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
    const allActiveTasks = await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.status, "active"));

    // Group tasks by context
    const contextDistribution: Record<string, number> = {};
    allActiveTasks.forEach((task) => {
      const context = task.context || "uncategorized";
      contextDistribution[context] = (contextDistribution[context] || 0) + 1;
    });

    // Sort contexts by task count
    const sortedContexts = Object.entries(contextDistribution)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Identify long-standing tasks (created over 30 days ago, still active)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const longStandingTasks = allActiveTasks.filter(
      (task) => task.createdAt < thirtyDaysAgo
    );

    const suggestedFocus = sortedContexts.map(([context, count]) => ({
      context,
      taskCount: count,
      suggestion: count > 10
        ? `High volume in ${context} (${count} tasks) - consider breaking down or prioritizing`
        : `${context} has ${count} active tasks`,
    }));

    // Add suggestion for long-standing tasks
    if (longStandingTasks.length > 5) {
      suggestedFocus.push({
        context: "long-standing",
        taskCount: longStandingTasks.length,
        suggestion: `${longStandingTasks.length} tasks have been active for 30+ days - review for relevance`,
      });
    }

    return reply.send({
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
