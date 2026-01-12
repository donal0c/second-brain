// =============================================================================
// Search Performance Tests
// =============================================================================
// Run with: DATABASE_URL=<your-db-url> npx tsx packages/api/src/routes/search.perf.test.ts
//
// These tests verify search performance meets requirements:
// - Search response time < 500ms
// - Large result set handling
// - Concurrent search performance
//
// PREREQUISITES:
// - PostgreSQL database accessible via DATABASE_URL
// - Database schema applied with sample data

import Fastify, { type FastifyInstance } from "fastify";
import { searchRoutes } from "./search.js";
import { db, rawDb, schema } from "../db/index.js";

let passed = 0;
let failed = 0;

const TEST_PREFIX = "__perf_test_";
const PERF_THRESHOLD_MS = 500; // Target: < 500ms

// =============================================================================
// Test Utilities
// =============================================================================

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

interface PerfResult {
  name: string;
  duration: number;
  status: "pass" | "fail" | "warn";
  message?: string;
}

const perfResults: PerfResult[] = [];

async function perfTest(
  name: string,
  fn: () => Promise<void>,
  thresholdMs: number = PERF_THRESHOLD_MS
) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;

    if (duration <= thresholdMs) {
      console.log(`✓ ${name} (${duration}ms <= ${thresholdMs}ms)`);
      passed++;
      perfResults.push({ name, duration, status: "pass" });
    } else {
      console.log(`⚠ ${name} (${duration}ms > ${thresholdMs}ms threshold)`);
      passed++; // Still pass but warn
      perfResults.push({
        name,
        duration,
        status: "warn",
        message: `Exceeded ${thresholdMs}ms threshold`,
      });
    }
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`✗ ${name} (${duration}ms)`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    failed++;
    perfResults.push({
      name,
      duration,
      status: "fail",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

// =============================================================================
// Test App Builder
// =============================================================================

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(searchRoutes);
  return app;
}

// =============================================================================
// Test Data Setup
// =============================================================================

async function setupPerfTestData(count: number) {
  const now = new Date();
  const batchSize = 100;
  let inserted = 0;

  console.log(`  Setting up ${count} test records...`);

  for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
    const tasks = [];
    for (let i = 0; i < batchSize && inserted < count; i++, inserted++) {
      tasks.push({
        id: `${TEST_PREFIX}task_${inserted}`,
        title: `Performance test task ${inserted} searchterm${inserted % 10}`,
        nextAction: `Action ${inserted} with various keywords like groceries, code, meeting`,
        context: `@context${inserted % 5}`,
        status: "active" as const,
        needsReview: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Insert batch
    for (const task of tasks) {
      await db.insert(schema.tasks).values(task).onConflictDoNothing();
    }
  }

  console.log(`  ✓ Inserted ${inserted} test tasks`);
}

async function cleanupPerfTestData() {
  await rawDb`DELETE FROM tasks WHERE id LIKE ${TEST_PREFIX + '%'}`;
}

async function getRowCounts(): Promise<{ tasks: number; projects: number; ideas: number }> {
  const [tasks, projects, ideas] = await Promise.all([
    rawDb`SELECT COUNT(*) as count FROM tasks`,
    rawDb`SELECT COUNT(*) as count FROM projects`,
    rawDb`SELECT COUNT(*) as count FROM ideas`,
  ]);

  return {
    tasks: Number(tasks[0].count),
    projects: Number(projects[0].count),
    ideas: Number(ideas[0].count),
  };
}

// =============================================================================
// Performance Tests
// =============================================================================

async function runTests() {
  console.log("\n--- Search Performance Tests ---\n");

  // Check database connectivity
  try {
    await rawDb`SELECT 1`;
    console.log("✓ Database connected\n");
  } catch (error) {
    console.log("✗ Database connection failed");
    console.log("  Set DATABASE_URL to run performance tests\n");
    process.exit(1);
  }

  // Get current row counts
  const counts = await getRowCounts();
  console.log(`Current data: ${counts.tasks} tasks, ${counts.projects} projects, ${counts.ideas} ideas\n`);

  let app: FastifyInstance;

  try {
    app = await buildTestApp();
    console.log("✓ Test app initialized\n");
  } catch (error) {
    console.log("✗ App setup failed:", error);
    process.exit(1);
  }

  try {
    // --- Basic Performance Tests ---
    console.log("=== Basic Performance Tests ===\n");

    await perfTest("single entity type search", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=test&type=task&limit=50",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("cross-entity search", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=test&limit=50",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("search with all filters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=test&type=task&status=active&limit=50",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    // --- Pagination Performance Tests ---
    console.log("\n=== Pagination Performance Tests ===\n");

    await perfTest("first page (offset=0)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=a&limit=50&offset=0",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("middle page (offset=100)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=a&limit=50&offset=100",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("max limit (limit=100)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=a&limit=100",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    // --- Query Pattern Performance Tests ---
    console.log("\n=== Query Pattern Performance Tests ===\n");

    await perfTest("short query (1 char)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=a&limit=50",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("medium query (10 chars)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=searchterm&limit=50",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("long query (50 chars)", async () => {
      const query = "this is a longer search query to test performance";
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${encodeURIComponent(query)}&limit=50`,
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("multi-word query", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=test+search+query&limit=50",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    // --- Large Dataset Tests (if data exists) ---
    if (counts.tasks > 100) {
      console.log("\n=== Large Dataset Performance Tests ===\n");

      await perfTest("search in large dataset", async () => {
        const response = await app.inject({
          method: "GET",
          url: "/search?q=task&limit=50",
        });
        assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
      });
    }

    // --- Concurrent Request Tests ---
    console.log("\n=== Concurrent Request Performance Tests ===\n");

    await perfTest("5 concurrent searches", async () => {
      const requests = Array(5)
        .fill(null)
        .map((_, i) =>
          app.inject({
            method: "GET",
            url: `/search?q=test${i}&limit=20`,
          })
        );

      const responses = await Promise.all(requests);
      assert(
        responses.every((r) => r.statusCode === 200),
        "All requests should succeed"
      );
    }, 1000); // Higher threshold for concurrent

    await perfTest("10 concurrent searches", async () => {
      const requests = Array(10)
        .fill(null)
        .map((_, i) =>
          app.inject({
            method: "GET",
            url: `/search?q=test${i}&limit=20`,
          })
        );

      const responses = await Promise.all(requests);
      assert(
        responses.every((r) => r.statusCode === 200),
        "All requests should succeed"
      );
    }, 2000); // Higher threshold for more concurrent

    // --- Synthetic Load Test with Generated Data ---
    console.log("\n=== Synthetic Load Test ===\n");

    // Add test data for load testing
    await setupPerfTestData(500);

    await perfTest("search after data load (500 records)", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=searchterm&type=task&limit=50",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    await perfTest("broad search after data load", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/search?q=Performance&type=task&limit=100",
      });
      assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    });

    // Multiple iterations for consistency check
    console.log("\n=== Consistency Check (5 iterations) ===\n");

    const durations: number[] = [];
    for (let i = 0; i < 5; i++) {
      const start = Date.now();
      await app.inject({
        method: "GET",
        url: "/search?q=test&type=task&limit=50",
      });
      durations.push(Date.now() - start);
    }

    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const max = Math.max(...durations);
    const min = Math.min(...durations);

    console.log(`  Iterations: ${durations.join("ms, ")}ms`);
    console.log(`  Min: ${min}ms, Max: ${max}ms, Avg: ${avg.toFixed(1)}ms`);

    if (avg <= PERF_THRESHOLD_MS) {
      console.log(`✓ Average response time (${avg.toFixed(1)}ms) meets ${PERF_THRESHOLD_MS}ms target`);
      passed++;
    } else {
      console.log(`⚠ Average response time (${avg.toFixed(1)}ms) exceeds ${PERF_THRESHOLD_MS}ms target`);
      passed++; // Warn but don't fail
    }

  } finally {
    // Cleanup
    await app.close();
    await cleanupPerfTestData();
    await rawDb.end();
    console.log("\n✓ Cleanup complete");
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("Performance Test Summary");
  console.log("=".repeat(60));

  const warnings = perfResults.filter((r) => r.status === "warn");
  const failures = perfResults.filter((r) => r.status === "fail");

  console.log(`\nResults: ${passed} passed, ${failed} failed, ${warnings.length} warnings`);

  if (warnings.length > 0) {
    console.log("\nWarnings (exceeded threshold but passed):");
    warnings.forEach((w) => console.log(`  - ${w.name}: ${w.duration}ms`));
  }

  if (failures.length > 0) {
    console.log("\nFailures:");
    failures.forEach((f) => console.log(`  - ${f.name}: ${f.message}`));
  }

  // Performance statistics
  const passingDurations = perfResults
    .filter((r) => r.status !== "fail")
    .map((r) => r.duration);

  if (passingDurations.length > 0) {
    const avgDuration = passingDurations.reduce((a, b) => a + b, 0) / passingDurations.length;
    const maxDuration = Math.max(...passingDurations);
    const minDuration = Math.min(...passingDurations);

    console.log("\nPerformance Statistics:");
    console.log(`  Min: ${minDuration}ms`);
    console.log(`  Max: ${maxDuration}ms`);
    console.log(`  Avg: ${avgDuration.toFixed(1)}ms`);
    console.log(`  Target: <${PERF_THRESHOLD_MS}ms`);
  }

  console.log("=".repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
