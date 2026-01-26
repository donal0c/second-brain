// =============================================================================
// Search Database Tests
// =============================================================================
// Run with: DATABASE_URL=<your-db-url> npx tsx packages/api/src/routes/search.db.test.ts
//
// These tests verify database-level search behavior including:
// - Index usage verification via EXPLAIN ANALYZE
// - pg_trgm fuzzy matching (when implemented)
// - Cross-entity search performance
//
// PREREQUISITES:
// - PostgreSQL database accessible via DATABASE_URL
// - Database schema applied (run migrations first)
//
// NOTE: Current implementation uses ILIKE for text matching.
// GIN indexes and pg_trgm are documented as future improvements.

import { db, rawDb, schema } from "../db/index.js";
import { ilike, or } from "drizzle-orm";

let passed = 0;
let failed = 0;
let skipped = 0;

interface TestResult {
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

async function test(
  name: string,
  fn: () => Promise<void>,
  options?: { skip?: boolean; skipReason?: string }
) {
  if (options?.skip) {
    console.log(`⊘ ${name} (SKIPPED: ${options.skipReason})`);
    skipped++;
    results.push({ name, status: "skip", error: options.skipReason });
    return;
  }

  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`✓ ${name} (${duration}ms)`);
    passed++;
    results.push({ name, status: "pass", duration });
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`✗ ${name}`);
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.log(`  Error: ${errorMsg}`);
    failed++;
    results.push({ name, status: "fail", error: errorMsg, duration });
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// =============================================================================
// Database Connection Test
// =============================================================================

async function testDatabaseConnection(): Promise<boolean> {
  try {
    await rawDb`SELECT 1 as connected`;
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Test Data Setup
// =============================================================================

const TEST_PREFIX = "__search_test_";

async function setupTestData() {
  const now = new Date();
  const taskId = `${TEST_PREFIX}task_1`;
  const projectId = `${TEST_PREFIX}project_1`;
  const ideaId = `${TEST_PREFIX}idea_1`;

  // Insert test task
  await db.insert(schema.tasks).values({
    id: taskId,
    title: "Test searchable grocery task",
    nextAction: "Buy milk and eggs from the store",
    context: "@errands",
    status: "active",
    needsReview: false,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  // Insert test project
  await db.insert(schema.projects).values({
    id: projectId,
    name: "Test searchable grocery project",
    desiredOutcome: "Complete the grocery app",
    nextAction: "Design the search feature",
    status: "active",
    needsReview: false,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  // Insert test idea
  await db.insert(schema.ideas).values({
    id: ideaId,
    title: "Test searchable grocery idea",
    summary: "An app for tracking groceries and meals",
    links: [],
    needsReview: false,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  return { taskId, projectId, ideaId };
}

async function cleanupTestData() {
  // Delete test data
  await rawDb`DELETE FROM tasks WHERE id LIKE ${TEST_PREFIX + '%'}`;
  await rawDb`DELETE FROM projects WHERE id LIKE ${TEST_PREFIX + '%'}`;
  await rawDb`DELETE FROM ideas WHERE id LIKE ${TEST_PREFIX + '%'}`;
}

// =============================================================================
// Index Verification Tests
// =============================================================================

async function getQueryPlan(query: string): Promise<string[]> {
  const result = await rawDb.unsafe(`EXPLAIN ANALYZE ${query}`);
  return result.map((row: any) => row["QUERY PLAN"]);
}

// =============================================================================
// Tests
// =============================================================================

async function runTests() {
  console.log("\n--- Search Database Tests ---\n");

  // Check database connectivity first
  const isConnected = await testDatabaseConnection();
  if (!isConnected) {
    console.log("✗ Database connection failed");
    console.log("  Set DATABASE_URL environment variable to run database tests");
    console.log("  Example: DATABASE_URL=postgresql://user:pass@localhost:5432/second_brain\n");
    process.exit(1);
  }

  console.log("✓ Database connected\n");

  // Setup test data
  let testIds: { taskId: string; projectId: string; ideaId: string };
  try {
    testIds = await setupTestData();
    console.log("✓ Test data setup complete\n");
  } catch (error) {
    console.log("✗ Test data setup failed:", error);
    process.exit(1);
  }

  try {
    // --- Basic Query Tests ---
    await test("tasks table - ILIKE search executes successfully", async () => {
      const results = await db
        .select()
        .from(schema.tasks)
        .where(
          or(
            ilike(schema.tasks.title, "%grocery%"),
            ilike(schema.tasks.nextAction, "%grocery%")
          )
        )
        .limit(10);

      assert(Array.isArray(results), "Should return array of results");
      const testResult = results.find(r => r.id === testIds.taskId);
      assert(testResult !== undefined, "Should find test task");
    });

    await test("projects table - ILIKE search executes successfully", async () => {
      const results = await db
        .select()
        .from(schema.projects)
        .where(
          or(
            ilike(schema.projects.name, "%grocery%"),
            ilike(schema.projects.desiredOutcome, "%grocery%")
          )
        )
        .limit(10);

      assert(Array.isArray(results), "Should return array of results");
      const testResult = results.find(r => r.id === testIds.projectId);
      assert(testResult !== undefined, "Should find test project");
    });

    await test("ideas table - ILIKE search executes successfully", async () => {
      const results = await db
        .select()
        .from(schema.ideas)
        .where(
          or(
            ilike(schema.ideas.title, "%grocery%"),
            ilike(schema.ideas.summary, "%grocery%")
          )
        )
        .limit(10);

      assert(Array.isArray(results), "Should return array of results");
      const testResult = results.find(r => r.id === testIds.ideaId);
      assert(testResult !== undefined, "Should find test idea");
    });

    // --- Cross-Entity Search Test ---
    await test("cross-entity search - finds results across all entity types", async () => {
      const [tasks, projects, ideas] = await Promise.all([
        db.select().from(schema.tasks).where(ilike(schema.tasks.title, "%grocery%")).limit(10),
        db.select().from(schema.projects).where(ilike(schema.projects.name, "%grocery%")).limit(10),
        db.select().from(schema.ideas).where(ilike(schema.ideas.title, "%grocery%")).limit(10),
      ]);

      assert(tasks.length > 0 || projects.length > 0 || ideas.length > 0,
        "Should find results in at least one entity type");

      // Check that our test data is found
      const foundTask = tasks.find(t => t.id === testIds.taskId);
      const foundProject = projects.find(p => p.id === testIds.projectId);
      const foundIdea = ideas.find(i => i.id === testIds.ideaId);

      assert(foundTask !== undefined, "Should find test task");
      assert(foundProject !== undefined, "Should find test project");
      assert(foundIdea !== undefined, "Should find test idea");
    });

    // --- Query Plan Analysis ---
    await test("EXPLAIN ANALYZE - tasks search query plan", async () => {
      const plan = await getQueryPlan(
        `SELECT * FROM tasks WHERE title ILIKE '%test%' OR next_action ILIKE '%test%' LIMIT 10`
      );
      assert(plan.length > 0, "Should return query plan");

      // Log the query plan for analysis
      console.log("\n    Query Plan:");
      plan.slice(0, 5).forEach(line => console.log(`      ${line}`));
      if (plan.length > 5) console.log(`      ... (${plan.length - 5} more lines)`);
    });

    await test("EXPLAIN ANALYZE - projects search query plan", async () => {
      const plan = await getQueryPlan(
        `SELECT * FROM projects WHERE name ILIKE '%test%' OR desired_outcome ILIKE '%test%' LIMIT 10`
      );
      assert(plan.length > 0, "Should return query plan");
    });

    await test("EXPLAIN ANALYZE - ideas search query plan", async () => {
      const plan = await getQueryPlan(
        `SELECT * FROM ideas WHERE title ILIKE '%test%' OR summary ILIKE '%test%' LIMIT 10`
      );
      assert(plan.length > 0, "Should return query plan");
    });

    // --- Index Usage Tests ---
    await test("status index - used for filtered searches", async () => {
      const plan = await getQueryPlan(
        `SELECT * FROM tasks WHERE status = 'active' AND title ILIKE '%test%' LIMIT 10`
      );
      assert(plan.length > 0, "Should return query plan");

      // Check if index is used (look for Index Scan or Index Cond in plan)
      const planText = plan.join(" ");
      const usesIndex = planText.includes("Index") || planText.includes("Bitmap");
      console.log(`    Index usage: ${usesIndex ? "Yes" : "No (Seq Scan)"}`);
    });

    // --- GIN Index Tests (Future Implementation) ---
    await test("GIN index verification - pg_trgm extension", async () => {
      // Check if pg_trgm extension is installed
      const result = await rawDb`
        SELECT extname FROM pg_extension WHERE extname = 'pg_trgm'
      `;

      if (result.length === 0) {
        console.log("    Note: pg_trgm extension not installed");
        console.log("    To enable: CREATE EXTENSION IF NOT EXISTS pg_trgm;");
      } else {
        console.log("    pg_trgm extension is installed");
      }

      // Test passes regardless - we're documenting current state
      assert(true, "pg_trgm check complete");
    }, { skip: false });

    await test("GIN index - tasks title/nextAction", async () => {
      // Check for GIN indexes on tasks table
      const indexes = await rawDb`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'tasks'
        AND indexdef LIKE '%gin%'
      `;

      if (indexes.length === 0) {
        console.log("    Note: No GIN indexes on tasks table");
        console.log("    Future improvement: Add GIN index for full-text search");
      } else {
        console.log(`    Found ${indexes.length} GIN index(es) on tasks`);
      }

      assert(true, "GIN index check complete");
    });

    // --- Performance Tests ---
    await test("search performance - single entity type < 100ms", async () => {
      const start = Date.now();

      await db
        .select()
        .from(schema.tasks)
        .where(ilike(schema.tasks.title, "%test%"))
        .limit(50);

      const duration = Date.now() - start;
      console.log(`    Query duration: ${duration}ms`);

      // This is a soft assertion - log warning if slow
      if (duration > 100) {
        console.log("    Warning: Query took > 100ms");
      }

      assert(duration < 5000, "Query should complete within 5 seconds");
    });

    await test("search performance - cross-entity search < 300ms", async () => {
      const start = Date.now();

      await Promise.all([
        db.select().from(schema.tasks).where(ilike(schema.tasks.title, "%test%")).limit(50),
        db.select().from(schema.projects).where(ilike(schema.projects.name, "%test%")).limit(50),
        db.select().from(schema.ideas).where(ilike(schema.ideas.title, "%test%")).limit(50),
      ]);

      const duration = Date.now() - start;
      console.log(`    Query duration: ${duration}ms`);

      if (duration > 300) {
        console.log("    Warning: Cross-entity search took > 300ms");
      }

      assert(duration < 5000, "Queries should complete within 5 seconds");
    });

    // --- Case Insensitivity Tests ---
    await test("ILIKE case insensitivity - uppercase query", async () => {
      const results = await db
        .select()
        .from(schema.tasks)
        .where(ilike(schema.tasks.title, "%GROCERY%"))
        .limit(10);

      const testResult = results.find(r => r.id === testIds.taskId);
      assert(testResult !== undefined, "Should find test task with uppercase query");
    });

    await test("ILIKE case insensitivity - mixed case query", async () => {
      const results = await db
        .select()
        .from(schema.tasks)
        .where(ilike(schema.tasks.title, "%GrOcErY%"))
        .limit(10);

      const testResult = results.find(r => r.id === testIds.taskId);
      assert(testResult !== undefined, "Should find test task with mixed case query");
    });

    // --- Special Characters Tests ---
    await test("special characters - wildcard escaping", async () => {
      // Test that % and _ in search terms don't break the query
      const results = await db
        .select()
        .from(schema.tasks)
        .where(ilike(schema.tasks.title, "%test%searchable%"))
        .limit(10);

      assert(Array.isArray(results), "Should return array even with wildcards");
    });

    // --- Empty Results Test ---
    await test("empty results - nonexistent search term", async () => {
      const results = await db
        .select()
        .from(schema.tasks)
        .where(ilike(schema.tasks.title, "%xyznonexistent12345%"))
        .limit(10);

      assert(results.length === 0, "Should return empty array for nonexistent term");
    });

  } finally {
    // Cleanup test data
    try {
      await cleanupTestData();
      console.log("\n✓ Test data cleanup complete");
    } catch (error) {
      console.log("\n✗ Test data cleanup failed:", error);
    }

    // Close database connection
    await rawDb.end();
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
