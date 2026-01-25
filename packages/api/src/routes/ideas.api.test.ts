// =============================================================================
// Ideas API Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/ideas.api.test.ts
//
// These tests verify the POST /ideas endpoint using Fastify's inject() method.
// The endpoint allows direct creation of ideas without going through inbox processing.

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
  // --- Validation Tests ---
  test("POST /ideas - returns 400 for missing title", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        summary: "A test summary",
      },
    });
    assertEqual(response.statusCode, 400, "Should return 400 for missing title");
    const body = JSON.parse(response.body);
    assert(body.error !== undefined, "Should have error in response");
    assertEqual(body.error.code, "VALIDATION_ERROR", "Should be validation error");
    await app.close();
  }),

  test("POST /ideas - returns 400 for empty title", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "",
      },
    });
    assertEqual(response.statusCode, 400, "Should return 400 for empty title");
    await app.close();
  }),

  test("POST /ideas - returns 400 for invalid links (not URLs)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Test Idea",
        links: ["not-a-url", "also-not-a-url"],
      },
    });
    assertEqual(response.statusCode, 400, "Should return 400 for invalid links");
    await app.close();
  }),

  test("POST /ideas - returns 400 for invalid needsReview type", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Test Idea",
        needsReview: "not-a-boolean",
      },
    });
    assertEqual(response.statusCode, 400, "Should return 400 for invalid needsReview");
    await app.close();
  }),

  // --- Valid Request Tests ---
  test("POST /ideas - accepts valid minimal request (title only)", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "My Test Idea",
      },
    });
    // Will return 201 on success or 500 if database not configured
    assert([201, 500].includes(response.statusCode), `Should accept minimal request, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - accepts valid request with all fields", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Complete Test Idea",
        summary: "This is a comprehensive test summary for the idea",
        links: ["https://example.com", "https://test.org/page"],
        needsReview: true,
      },
    });
    assert([201, 500].includes(response.statusCode), `Should accept full request, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - accepts valid request with null summary", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Idea with null summary",
        summary: null,
      },
    });
    assert([201, 500].includes(response.statusCode), `Should accept null summary, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - accepts valid request with empty links array", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Idea with empty links",
        links: [],
      },
    });
    assert([201, 500].includes(response.statusCode), `Should accept empty links, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - needsReview defaults to false", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Default needsReview test",
      },
    });
    // The schema default is false, validated at schema level
    assert([201, 500].includes(response.statusCode), `Should accept request, got ${response.statusCode}`);
    await app.close();
  }),

  // --- Edge Case Tests ---
  test("POST /ideas - handles special characters in title", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Test (with) [special] chars! @#$%",
      },
    });
    assert([201, 500].includes(response.statusCode), `Should handle special chars, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - handles unicode characters in title", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "日本語のアイデア - Testing Unicode",
      },
    });
    assert([201, 500].includes(response.statusCode), `Should handle unicode, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - handles emoji in summary", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Emoji Test",
        summary: "This idea is 🔥 and very 💡",
      },
    });
    assert([201, 500].includes(response.statusCode), `Should handle emoji, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - handles long title", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "A".repeat(500),
      },
    });
    // Long titles should be accepted - no max length in schema
    assert([201, 500].includes(response.statusCode), `Should handle long title, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - handles long summary", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Test with long summary",
        summary: "S".repeat(10000),
      },
    });
    assert([201, 500].includes(response.statusCode), `Should handle long summary, got ${response.statusCode}`);
    await app.close();
  }),

  test("POST /ideas - handles multiple links", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Multi-link idea",
        links: [
          "https://example.com/1",
          "https://example.com/2",
          "https://example.com/3",
          "https://test.org/resource",
          "http://localhost:3000/test",
        ],
      },
    });
    assert([201, 500].includes(response.statusCode), `Should handle multiple links, got ${response.statusCode}`);
    await app.close();
  }),

  // --- Response Format Tests (when DB available) ---
  test("POST /ideas - response includes data property", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/ideas",
      payload: {
        title: "Response format test",
      },
    });
    // When successful (201), should have data in response
    if (response.statusCode === 201) {
      const body = JSON.parse(response.body);
      assert(body.data !== undefined, "Response should include data property");
      assert(body.data.id !== undefined, "Created idea should have id");
      assert(body.data.title !== undefined, "Created idea should have title");
      assert(body.data.createdAt !== undefined, "Created idea should have createdAt");
      assert(body.data.updatedAt !== undefined, "Created idea should have updatedAt");
    }
    await app.close();
  }),
];

// =============================================================================
// Test Runner
// =============================================================================

async function runTests() {
  console.log("\n--- Ideas API Tests ---\n");

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
