import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { eq, sql, and, or, isNull, lt, gte, lte } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { randomUUID } from "crypto";

// =============================================================================
// Request Schemas
// =============================================================================

const SnoozeSchema = z.object({
  hours: z.number().min(1).max(168).optional().default(24), // Default 24 hours, max 1 week
});

// =============================================================================
// Nudge Detection Logic
// =============================================================================

type NudgeCandidate = {
  type: "follow_up_overdue" | "project_missing_next_action" | "task_due_soon" | "task_stale" | "person_follow_up";
  message: string;
  entityType: "task" | "project" | "person";
  entityId: string;
};

async function detectNudges(): Promise<NudgeCandidate[]> {
  const candidates: NudgeCandidate[] = [];
  const now = Date.now();
  const oneDayFromNow = new Date(now + 24 * 60 * 60 * 1000);
  const twoDaysFromNow = new Date(now + 2 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

  // 1. Tasks due in the next 24-48 hours (not overdue yet)
  const tasksDueSoon = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.status, "active"),
        gte(schema.tasks.dueDate, oneDayFromNow),
        lte(schema.tasks.dueDate, twoDaysFromNow)
      )
    )
    .limit(5);

  for (const task of tasksDueSoon) {
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    const dueDateStr = dueDate ? dueDate.toLocaleDateString() : "soon";
    candidates.push({
      type: "task_due_soon",
      message: `"${task.title}" is due ${dueDateStr}`,
      entityType: "task",
      entityId: task.id,
    });
  }

  // 2. Stale tasks (active tasks not updated in 7+ days)
  const staleTasks = await db
    .select()
    .from(schema.tasks)
    .where(
      and(
        eq(schema.tasks.status, "active"),
        lt(schema.tasks.updatedAt, sevenDaysAgo)
      )
    )
    .orderBy(schema.tasks.updatedAt)
    .limit(5);

  for (const task of staleTasks) {
    const daysSinceUpdate = Math.floor((now - task.updatedAt.getTime()) / (24 * 60 * 60 * 1000));
    candidates.push({
      type: "task_stale",
      message: `"${task.title}" hasn't been updated in ${daysSinceUpdate} days`,
      entityType: "task",
      entityId: task.id,
    });
  }

  // 3. Projects without next actions (active projects only)
  const projectsWithoutNextAction = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.status, "active"),
        isNull(schema.projects.nextAction)
      )
    )
    .limit(5);

  for (const project of projectsWithoutNextAction) {
    candidates.push({
      type: "project_missing_next_action",
      message: `Project "${project.name}" needs a next action defined`,
      entityType: "project",
      entityId: project.id,
    });
  }

  // 4. People follow-ups (if lastTouchedAt is > 14 days and followUpNextAction is set)
  const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
  const peopleNeedingFollowUp = await db
    .select()
    .from(schema.persons)
    .where(
      and(
        lt(schema.persons.lastTouchedAt, fourteenDaysAgo),
        sql`${schema.persons.followUpNextAction} IS NOT NULL`
      )
    )
    .limit(5);

  for (const person of peopleNeedingFollowUp) {
    const daysSinceTouch = Math.floor((now - (person.lastTouchedAt?.getTime() ?? now)) / (24 * 60 * 60 * 1000));
    candidates.push({
      type: "person_follow_up",
      message: `It's been ${daysSinceTouch} days since you touched base with ${person.name}`,
      entityType: "person",
      entityId: person.id,
    });
  }

  return candidates;
}

async function getActiveNudges(): Promise<Array<{
  id: string;
  type: string;
  message: string;
  entityType: string;
  entityId: string;
  createdAt: Date;
}>> {
  const now = new Date();

  // Get existing active nudges (not dismissed and not snoozed)
  const existingNudges = await db
    .select()
    .from(schema.nudges)
    .where(
      and(
        isNull(schema.nudges.dismissedAt),
        or(
          isNull(schema.nudges.snoozedUntil),
          lt(schema.nudges.snoozedUntil, now)
        )
      )
    )
    .orderBy(schema.nudges.createdAt);

  // Get count of nudges created today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayNudges = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.nudges)
    .where(
      and(
        gte(schema.nudges.createdAt, todayStart),
        isNull(schema.nudges.dismissedAt)
      )
    );

  const todayNudgeCount = todayNudges[0]?.count ?? 0;

  // If we already have 2 or more nudges today, return existing active ones
  if (todayNudgeCount >= 2) {
    return existingNudges;
  }

  // Detect new nudge candidates
  const candidates = await detectNudges();

  // Filter out candidates for which we already have active nudges
  const existingEntityIds = new Set(
    existingNudges.map(n => `${n.entityType}:${n.entityId}`)
  );

  const newCandidates = candidates.filter(
    c => !existingEntityIds.has(`${c.entityType}:${c.entityId}`)
  );

  // Create new nudges up to the daily limit (2 total per day)
  const nudgesToCreate = newCandidates.slice(0, 2 - todayNudgeCount);

  for (const candidate of nudgesToCreate) {
    const nudge = {
      id: randomUUID(),
      type: candidate.type,
      message: candidate.message,
      entityType: candidate.entityType,
      entityId: candidate.entityId,
      createdAt: now,
      dismissedAt: null,
      snoozedUntil: null,
    };

    await db.insert(schema.nudges).values(nudge);
    existingNudges.push(nudge);
  }

  return existingNudges;
}

// =============================================================================
// Nudge Routes
// =============================================================================

export async function nudgeRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /nudges - Get active nudges
   */
  app.get("/nudges", async (_request: FastifyRequest, reply: FastifyReply) => {
    const activeNudges = await getActiveNudges();

    return reply.send({
      nudges: activeNudges,
      count: activeNudges.length,
    });
  });

  /**
   * POST /nudges/:id/dismiss - Dismiss a nudge
   */
  app.post(
    "/nudges/:id/dismiss",
    async (
      request: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      // Check if nudge exists
      const nudge = await db
        .select()
        .from(schema.nudges)
        .where(eq(schema.nudges.id, id))
        .limit(1);

      if (nudge.length === 0) {
        return reply.status(404).send({ error: "Nudge not found" });
      }

      // Update nudge as dismissed
      await db
        .update(schema.nudges)
        .set({ dismissedAt: new Date() })
        .where(eq(schema.nudges.id, id));

      return reply.send({ success: true });
    }
  );

  /**
   * POST /nudges/:id/snooze - Snooze a nudge
   */
  app.post(
    "/nudges/:id/snooze",
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof SnoozeSchema>;
      }>,
      reply: FastifyReply
    ) => {
      const { id } = request.params;

      const parseResult = SnoozeSchema.safeParse(request.body);
      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Validation failed",
          details: parseResult.error.flatten().fieldErrors,
        });
      }

      const { hours } = parseResult.data;

      // Check if nudge exists
      const nudge = await db
        .select()
        .from(schema.nudges)
        .where(eq(schema.nudges.id, id))
        .limit(1);

      if (nudge.length === 0) {
        return reply.status(404).send({ error: "Nudge not found" });
      }

      // Calculate snooze until time
      const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000);

      // Update nudge as snoozed
      await db
        .update(schema.nudges)
        .set({ snoozedUntil })
        .where(eq(schema.nudges.id, id));

      return reply.send({ success: true, snoozedUntil: snoozedUntil.toISOString() });
    }
  );
}
