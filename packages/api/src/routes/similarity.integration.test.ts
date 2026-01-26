// =============================================================================
// Similarity Integration Tests
// =============================================================================
// Run with: DATABASE_URL=<your-db-url> npx tsx packages/api/src/routes/similarity.integration.test.ts
//
// PREREQUISITES:
// - PostgreSQL database accessible via DATABASE_URL
// - Database schema applied (run migrations first)
// - OPENAI_API_KEY set for semantic tests (optional)

import Fastify, { type FastifyInstance } from "fastify";
import { similarityRoutes } from "./similarity.js";
import { db, rawDb, schema } from "../db/index.js";

let passed = 0;
let failed = 0;

const TEST_PREFIX = "__integration_test_";

// =============================================================================
// Test Utilities
// =============================================================================

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    const duration = Date.now() - start;
    console.log(`✓ ${name} (${duration}ms)`);
    passed++;
  } catch (error) {
    const duration = Date.now() - start;
    console.log(`✗ ${name} (${duration}ms)`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    failed++;
  }
}

// =============================================================================
// Test App Builder
// =============================================================================

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(similarityRoutes);
  return app;
}

// =============================================================================
// Test Data Setup
// =============================================================================

async function setupTestData() {
  const now = new Date();
  const uniqueTerm = `similarity${Date.now()}`;

  const taskId = `${TEST_PREFIX}task_${uniqueTerm}`;
  await db.insert(schema.tasks).values({
    id: taskId,
    title: `Task ${uniqueTerm}`,
    nextAction: "Test similarity route",
    context: "@testing",
    status: "active",
    needsReview: false,
    createdAt: now,
    updatedAt: now,
  }).onConflictDoNothing();

  return { taskId, uniqueTerm };
}

async function cleanupTestData() {
  await rawDb`DELETE FROM tasks WHERE id LIKE ${TEST_PREFIX + '%'}`;
}

// =============================================================================
// Integration Tests
// =============================================================================

async function runTests() {
  console.log("\n--- Similarity Integration Tests ---\n");

  if (!process.env.DATABASE_URL) {
    console.log("⚠ Skipping integration tests (set DATABASE_URL to enable)\n");
    process.exit(0);
  }

  // Check database connectivity
  try {
    await rawDb`SELECT 1`;
    console.log("✓ Database connected\n");
  } catch {
    console.log("✗ Database connection failed");
    console.log("  Set DATABASE_URL to run integration tests\n");
    process.exit(1);
  }

  const shouldRunSemanticTests = !!process.env.OPENAI_API_KEY && process.env.RUN_OPENAI_TESTS === "1";
  if (!shouldRunSemanticTests) {
    console.log("⚠ Skipping semantic tests (set RUN_OPENAI_TESTS=1 to enable)\n");
  }

  let app: FastifyInstance;
  try {
    await setupTestData();
    app = await buildTestApp();
  } catch (error) {
    console.log("✗ Setup failed:", error);
    await cleanupTestData();
    process.exit(1);
  }

  try {
    await test("GET /:entityType/:id/similar works without OPENAI_API_KEY", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const response = await app.inject({
        method: "GET",
        url: `/tasks/${TEST_PREFIX}task_missing/similar?limit=5`,
      });

      assertEqual(response.statusCode, 200, "Should allow similarity without API key");

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    await test("GET /:entityType/:id/similar returns 400 for invalid type", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/invalid/${TEST_PREFIX}task_missing/similar`,
      });

      assertEqual(response.statusCode, 400, "Should return 400 for invalid type");
    });

    await test("POST /similar returns 400 without OPENAI_API_KEY", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const response = await app.inject({
        method: "POST",
        url: `/similar`,
        payload: { text: "Test similarity text" },
      });

      assertEqual(response.statusCode, 400, "Should return 400 without API key");

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    if (shouldRunSemanticTests) {
      const { taskId, uniqueTerm } = await setupTestData();

      await test("POST /similar returns data with similarity scores", async () => {
        const response = await app.inject({
          method: "POST",
          url: `/similar`,
          payload: { text: `Task ${uniqueTerm}`, types: ["task"], limit: 5 },
        });

        assertEqual(response.statusCode, 200, "Should return 200");
        const body = JSON.parse(response.body);
        assert(body.data !== undefined, "Should have data object");

        const taskResults = body.data.task || [];
        if (taskResults.length > 0) {
          assert(
            typeof taskResults[0].similarity === "number",
            "Similarity should be numeric"
          );
        }
      });

      await test("GET /tasks/:id/similar returns results", async () => {
        const response = await app.inject({
          method: "GET",
          url: `/tasks/${taskId}/similar?limit=5`,
        });

        assertEqual(response.statusCode, 200, "Should return 200");
      });
    }
  } finally {
    await app.close();
    await cleanupTestData();
    await rawDb.end();
    console.log("\n✓ Cleanup complete");
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
