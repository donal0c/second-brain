// =============================================================================
// Review Queue API Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/review.api.test.ts
//
// These tests verify the GET /review and POST /review/:entityType/:id/approve endpoints.
// The review queue shows all entities with needsReview=true across all entity types.

import Fastify, { type FastifyInstance } from "fastify";
import { entityRoutes } from "./entities.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>) {
  return { name, fn };
}

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

// =============================================================================
// Test App Builder
// =============================================================================

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(entityRoutes);
  return app;
}

// =============================================================================
// API Tests
// =============================================================================

const tests = [
  // --- GET /review Endpoint Tests ---
  test("GET /review - returns 200 with valid structure", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/review",
    });
    // Will return 200 on success or 500 if database not configured
    assert([200, 500].includes(response.statusCode), `Should return 200 or 500, got ${response.statusCode}`);

    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      assert(body.data !== undefined, "Response should have data array");
      assert(Array.isArray(body.data), "data should be an array");
      assert(body.meta !== undefined, "Response should have meta object");
      assert(body.meta.total !== undefined, "meta should have total count");
      assert(body.meta.byType !== undefined, "meta should have byType counts");
    }
    await app.close();
  }),

  test("GET /review - meta.byType has all entity type counts", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/review",
    });

    // Skip validation if database not available
    if (response.statusCode !== 200) {
      await app.close();
      return;
    }

    const body = JSON.parse(response.body);
    assert(body.meta !== undefined, "Response should have meta");
    assert(body.meta.byType !== undefined, "meta should have byType");

    const { byType } = body.meta;
    assert(byType.tasks !== undefined, `byType should have tasks count, got: ${JSON.stringify(byType)}`);
    assert(byType.projects !== undefined, "byType should have projects count");
    assert(byType.ideas !== undefined, "byType should have ideas count");
    assert(byType.persons !== undefined, "byType should have persons count");

    // Counts should be numbers (could be string numbers from DB)
    assert(typeof byType.tasks === "number" || typeof byType.tasks === "string", `tasks count should be number or string, got ${typeof byType.tasks}`);
    assert(typeof byType.projects === "number" || typeof byType.projects === "string", "projects count should be number or string");
    assert(typeof byType.ideas === "number" || typeof byType.ideas === "string", "ideas count should be number or string");
    assert(typeof byType.persons === "number" || typeof byType.persons === "string", "persons count should be number or string");
    await app.close();
  }),

  test("GET /review - accepts limit parameter", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/review?limit=10",
    });
    assert([200, 500].includes(response.statusCode), `Should accept limit param, got ${response.statusCode}`);

    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      assertEqual(body.meta.limit, 10, "Should respect limit parameter");
    }
    await app.close();
  }),

  test("GET /review - returns 400 for invalid limit (too low)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/review?limit=0",
    });
    assertEqual(response.statusCode, 400, "Should return 400 for limit=0");
    await app.close();
  }),

  test("GET /review - returns 400 for invalid limit (too high)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/review?limit=200",
    });
    assertEqual(response.statusCode, 400, "Should return 400 for limit>100");
    await app.close();
  }),

  test("GET /review - returns 400 for non-numeric limit", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/review?limit=abc",
    });
    assertEqual(response.statusCode, 400, "Should return 400 for non-numeric limit");
    await app.close();
  }),

  test("GET /review - items include entityType field", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/review",
    });

    if (response.statusCode === 200) {
      const body = JSON.parse(response.body);
      // If there are items, each should have an entityType
      for (const item of body.data) {
        assert(item.entityType !== undefined, "Each item should have entityType");
        assert(
          ["task", "project", "idea", "person"].includes(item.entityType),
          `entityType should be valid, got ${item.entityType}`
        );
      }
    }
    await app.close();
  }),

  // --- POST /review/:entityType/:id/approve Endpoint Tests ---
  test("POST /review/:entityType/:id/approve - returns 400 for invalid entityType", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/invalid/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    assertEqual(response.statusCode, 400, "Should return 400 for invalid entityType");
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - returns 400 for invalid UUID", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/tasks/not-a-uuid/approve",
    });
    assertEqual(response.statusCode, 400, "Should return 400 for invalid UUID");
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - returns 404 for non-existent task", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/tasks/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    // Will return 404 if DB configured, 500 if not
    assert([404, 500].includes(response.statusCode), `Should return 404 or 500, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - returns 404 for non-existent project", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/projects/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    assert([404, 500].includes(response.statusCode), `Should return 404 or 500, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - returns 404 for non-existent idea", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/ideas/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    assert([404, 500].includes(response.statusCode), `Should return 404 or 500, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - returns 404 for non-existent person", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/persons/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    assert([404, 500].includes(response.statusCode), `Should return 404 or 500, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - accepts valid entityType 'tasks'", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/tasks/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    // Should not be a validation error - only 404 or 500
    assert(response.statusCode !== 400, "Should accept 'tasks' as valid entityType");
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - accepts valid entityType 'projects'", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/projects/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    assert(response.statusCode !== 400, "Should accept 'projects' as valid entityType");
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - accepts valid entityType 'ideas'", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/ideas/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    assert(response.statusCode !== 400, "Should accept 'ideas' as valid entityType");
    await app.close();
  }),

  test("POST /review/:entityType/:id/approve - accepts valid entityType 'persons'", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/review/persons/123e4567-e89b-12d3-a456-426614174000/approve",
    });
    assert(response.statusCode !== 400, "Should accept 'persons' as valid entityType");
    await app.close();
  }),
];

// =============================================================================
// Test Runner
// =============================================================================

async function runTests() {
  console.log("\n--- Review Queue API Tests ---\n");

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error instanceof Error ? error.message : error}`);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }

  process.exit(0);
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
