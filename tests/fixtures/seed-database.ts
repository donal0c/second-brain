/**
 * Test Database Seeding Script
 *
 * Usage:
 *   DATABASE_URL=... npx tsx tests/fixtures/seed-database.ts [scenario]
 *
 * Scenarios:
 *   empty     - Clear all data (default)
 *   busy      - Load busy user scenario
 *   custom    - Load from JSON file (specify path with --file)
 *
 * Examples:
 *   npx tsx tests/fixtures/seed-database.ts empty
 *   npx tsx tests/fixtures/seed-database.ts busy
 *   TEST_DATABASE_URL=... npx tsx tests/fixtures/seed-database.ts busy
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import {
  emptyScenario,
  busyUserScenario,
} from "./test-data.js";

// =============================================================================
// Database Connection
// =============================================================================

const DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "postgresql://localhost:5432/second_brain_test";

const client = postgres(DATABASE_URL);
const db = drizzle(client);

// =============================================================================
// Table Names (ordered for foreign key constraints)
// =============================================================================

const TABLES_TO_CLEAR = [
  "nudges",
  "clarifications",
  "receipts",
  "personal_contexts",
  "persons",
  "ideas",
  "projects",
  "tasks",
  "inbox_items",
];

// =============================================================================
// Seed Functions
// =============================================================================

async function clearAllData() {
  console.log("Clearing all test data...");

  for (const table of TABLES_TO_CLEAR) {
    await db.execute(sql.raw(`DELETE FROM ${table}`));
    console.log(`  Cleared: ${table}`);
  }

  console.log("All data cleared.");
}

async function seedInboxItems(items: typeof busyUserScenario.inboxItems) {
  if (items.length === 0) return;

  console.log(`Seeding ${items.length} inbox items...`);
  const now = new Date();

  for (const item of items) {
    await db.execute(sql`
      INSERT INTO inbox_items (id, captured_at, raw_text, source, status, clarification_attempts)
      VALUES (
        ${item.id},
        ${now},
        ${item.rawText},
        ${item.source},
        ${item.status},
        ${(item as any).clarificationAttempts || 0}
      )
      ON CONFLICT (id) DO UPDATE SET
        raw_text = EXCLUDED.raw_text,
        status = EXCLUDED.status
    `);
  }
}

async function seedTasks(items: typeof busyUserScenario.tasks) {
  if (items.length === 0) return;

  console.log(`Seeding ${items.length} tasks...`);
  const now = new Date();

  for (const item of items) {
    await db.execute(sql`
      INSERT INTO tasks (id, title, next_action, due_date, context, status, needs_review, created_at, updated_at)
      VALUES (
        ${item.id},
        ${item.title},
        ${item.nextAction},
        ${(item as any).dueDate || null},
        ${item.context || null},
        ${item.status},
        ${item.needsReview},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        next_action = EXCLUDED.next_action,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `);
  }
}

async function seedProjects(items: typeof busyUserScenario.projects) {
  if (items.length === 0) return;

  console.log(`Seeding ${items.length} projects...`);
  const now = new Date();

  for (const item of items) {
    await db.execute(sql`
      INSERT INTO projects (id, name, desired_outcome, next_action, status, needs_review, created_at, updated_at)
      VALUES (
        ${item.id},
        ${item.name},
        ${item.desiredOutcome || null},
        ${item.nextAction},
        ${item.status},
        ${item.needsReview},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        status = EXCLUDED.status,
        updated_at = EXCLUDED.updated_at
    `);
  }
}

async function seedIdeas(items: typeof busyUserScenario.ideas) {
  if (items.length === 0) return;

  console.log(`Seeding ${items.length} ideas...`);
  const now = new Date();

  for (const item of items) {
    await db.execute(sql`
      INSERT INTO ideas (id, title, summary, links, needs_review, created_at, updated_at)
      VALUES (
        ${item.id},
        ${item.title},
        ${item.summary},
        ${JSON.stringify(item.links)}::jsonb,
        ${item.needsReview},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        summary = EXCLUDED.summary,
        updated_at = EXCLUDED.updated_at
    `);
  }
}

async function seedPersons(items: typeof busyUserScenario.persons) {
  if (items.length === 0) return;

  console.log(`Seeding ${items.length} persons...`);
  const now = new Date();

  for (const item of items) {
    await db.execute(sql`
      INSERT INTO persons (id, name, relationship_context, last_touched_at, follow_up_next_action, needs_review, created_at, updated_at)
      VALUES (
        ${item.id},
        ${item.name},
        ${item.relationshipContext || null},
        ${(item as any).lastTouchedAt || null},
        ${item.followUpNextAction || null},
        ${item.needsReview},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        relationship_context = EXCLUDED.relationship_context,
        updated_at = EXCLUDED.updated_at
    `);
  }
}

async function seedPersonalContexts(
  items: typeof busyUserScenario.personalContexts
) {
  if (items.length === 0) return;

  console.log(`Seeding ${items.length} personal contexts...`);
  const now = new Date();

  for (const item of items) {
    await db.execute(sql`
      INSERT INTO personal_contexts (id, name, type, description, domain, mention_count, created_at, updated_at)
      VALUES (
        ${item.id},
        ${item.name},
        ${item.type},
        ${item.description || null},
        ${item.domain || null},
        ${item.mentionCount},
        ${now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        mention_count = EXCLUDED.mention_count,
        updated_at = EXCLUDED.updated_at
    `);
  }
}

async function seedScenario(
  scenario: typeof busyUserScenario | typeof emptyScenario
) {
  await clearAllData();

  await seedInboxItems(scenario.inboxItems);
  await seedTasks(scenario.tasks);
  await seedProjects(scenario.projects);
  await seedIdeas(scenario.ideas);
  await seedPersons(scenario.persons);
  await seedPersonalContexts(scenario.personalContexts);

  console.log("Seeding complete.");
}

// =============================================================================
// CLI Runner
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const scenario = args[0] || "empty";

  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);
  console.log(`Scenario: ${scenario}`);
  console.log("");

  try {
    switch (scenario) {
      case "empty":
        await seedScenario(emptyScenario);
        break;

      case "busy":
        await seedScenario(busyUserScenario);
        break;

      default:
        console.error(`Unknown scenario: ${scenario}`);
        console.error("Available scenarios: empty, busy");
        process.exit(1);
    }
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Export for programmatic use
export { clearAllData, seedScenario, emptyScenario, busyUserScenario };

// Run if called directly
main().catch(console.error);
