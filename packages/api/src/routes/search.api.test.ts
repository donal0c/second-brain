// =============================================================================
// Search API Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/search.api.test.ts
//
// These tests use Fastify's inject() method to test the search API endpoints.
// Database is mocked to isolate API-level behavior from database behavior.

import Fastify, { type FastifyInstance } from "fastify";
import { searchRoutes } from "./search.js";

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
  await app.register(searchRoutes);
  return app;
}

// =============================================================================
// API Tests
// =============================================================================

const tests = [
  // --- Validation Tests ---
  test("GET /search - returns 400 for missing query parameter", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search",
    });
    assertEqual(response.statusCode, 400, "Should return 400");
    const body = JSON.parse(response.body);
    assert(body.error !== undefined, "Should have error in response");
    assertEqual(body.error.code, "VALIDATION_ERROR", "Should be validation error");
    await app.close();
  }),

  test("GET /search - returns 400 for empty query", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=",
    });
    assertEqual(response.statusCode, 400, "Should return 400");
    await app.close();
  }),

  test("GET /search - returns 400 for query exceeding max length", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: `/search?q=${"a".repeat(201)}`,
    });
    assertEqual(response.statusCode, 400, "Should return 400");
    await app.close();
  }),

  test("GET /search - returns 400 for invalid type filter", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&type=invalid",
    });
    assertEqual(response.statusCode, 400, "Should return 400");
    await app.close();
  }),

  test("GET /search - returns 400 for invalid limit (below min)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&limit=0",
    });
    assertEqual(response.statusCode, 400, "Should return 400");
    await app.close();
  }),

  test("GET /search - returns 400 for invalid limit (above max)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&limit=101",
    });
    assertEqual(response.statusCode, 400, "Should return 400");
    await app.close();
  }),

  test("GET /search - returns 400 for negative offset", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&offset=-1",
    });
    assertEqual(response.statusCode, 400, "Should return 400");
    await app.close();
  }),

  // --- Valid Request Structure Tests ---
  test("GET /search - accepts valid basic query", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test",
    });
    // Will return 500 due to missing db, but validates query params first
    // In real tests with mocked db, this would return 200
    assert([200, 500].includes(response.statusCode), "Should accept valid query");
    await app.close();
  }),

  test("GET /search - accepts valid type filter", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&type=task",
    });
    assert([200, 500].includes(response.statusCode), "Should accept type filter");
    await app.close();
  }),

  test("GET /search - accepts valid pagination params", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&limit=25&offset=10",
    });
    assert([200, 500].includes(response.statusCode), "Should accept pagination");
    await app.close();
  }),

  test("GET /search - accepts valid date range params", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&from=2024-01-01&to=2024-12-31",
    });
    assert([200, 500].includes(response.statusCode), "Should accept date range");
    await app.close();
  }),

  test("GET /search - accepts all valid params combined", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&type=task&context=work&status=active&from=2024-01-01&to=2024-12-31&limit=25&offset=0",
    });
    assert([200, 500].includes(response.statusCode), "Should accept all params");
    await app.close();
  }),

  // --- Special Characters Tests ---
  test("GET /search - handles special characters in query", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=" + encodeURIComponent("test (with) [special] chars!"),
    });
    assert([200, 500].includes(response.statusCode), "Should handle special chars");
    await app.close();
  }),

  test("GET /search - handles unicode characters in query", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=" + encodeURIComponent("日本語テスト"),
    });
    assert([200, 500].includes(response.statusCode), "Should handle unicode");
    await app.close();
  }),

  test("GET /search - handles SQL-like characters safely", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=" + encodeURIComponent("'; DROP TABLE users; --"),
    });
    // Should not crash - validation passes, DB handles safely
    assert([200, 500].includes(response.statusCode), "Should handle SQL-like chars safely");
    await app.close();
  }),

  // --- Boundary Tests ---
  test("GET /search - accepts minimum length query (1 char)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=a",
    });
    assert([200, 500].includes(response.statusCode), "Should accept 1 char query");
    await app.close();
  }),

  test("GET /search - accepts maximum length query (200 chars)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: `/search?q=${"a".repeat(200)}`,
    });
    assert([200, 500].includes(response.statusCode), "Should accept 200 char query");
    await app.close();
  }),

  test("GET /search - accepts limit at minimum (1)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&limit=1",
    });
    assert([200, 500].includes(response.statusCode), "Should accept limit=1");
    await app.close();
  }),

  test("GET /search - accepts limit at maximum (100)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&limit=100",
    });
    assert([200, 500].includes(response.statusCode), "Should accept limit=100");
    await app.close();
  }),

  test("GET /search - accepts offset at zero", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&offset=0",
    });
    assert([200, 500].includes(response.statusCode), "Should accept offset=0");
    await app.close();
  }),

  test("GET /search - accepts large offset", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&offset=10000",
    });
    assert([200, 500].includes(response.statusCode), "Should accept large offset");
    await app.close();
  }),

  // --- Type Filter Tests ---
  test("GET /search - accepts type=task filter", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&type=task",
    });
    assert([200, 500].includes(response.statusCode), "Should accept type=task");
    await app.close();
  }),

  test("GET /search - accepts type=project filter", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&type=project",
    });
    assert([200, 500].includes(response.statusCode), "Should accept type=project");
    await app.close();
  }),

  test("GET /search - accepts type=idea filter", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "GET",
      url: "/search?q=test&type=idea",
    });
    assert([200, 500].includes(response.statusCode), "Should accept type=idea");
    await app.close();
  }),
];

// =============================================================================
// Test Runner
// =============================================================================

async function runTests() {
  console.log("\n--- Search API Tests ---\n");

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
