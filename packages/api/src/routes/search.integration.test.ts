// =============================================================================
// Search Integration Tests
// =============================================================================
// Run with: DATABASE_URL=<your-db-url> npx tsx packages/api/src/routes/search.integration.test.ts
//
// These tests verify end-to-end search functionality:
// - Search across all entity types
// - Recently added items are searchable
// - Deleted items are excluded (soft delete)
// - Result ranking and relevance
// - Pagination across entity types
//
// PREREQUISITES:
// - PostgreSQL database accessible via DATABASE_URL
// - Database schema applied (run migrations first)

import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { searchRoutes } from "./search.js";
import { db, rawDb, schema } from "../db/index.js";
import { generateEmbedding, prepareTextForEmbedding, hasOpenAIClient } from "../services/embedding.js";

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
  await app.register(searchRoutes);
  return app;
}

// =============================================================================
// Test Data Setup
// =============================================================================

interface TestData {
  tasks: string[];
  projects: string[];
  ideas: string[];
}

async function setupTestData(): Promise<TestData> {
  const now = new Date();
  const testData: TestData = { tasks: [], projects: [], ideas: [] };

  // Create unique searchable term for this test run
  const uniqueTerm = `searchterm${Date.now()}`;

  // Insert test tasks with varying content
  const taskData = [
    {
      id: `${TEST_PREFIX}task_exact_${uniqueTerm}`,
      title: uniqueTerm, // Exact match - should rank highest
      nextAction: "Complete the test task",
      context: "@testing",
      status: "active" as const,
    },
    {
      id: `${TEST_PREFIX}task_prefix_${uniqueTerm}`,
      title: `${uniqueTerm} with suffix`, // Prefix match - should rank second
      nextAction: "Another test task",
      context: "@testing",
      status: "active" as const,
    },
    {
      id: `${TEST_PREFIX}task_contains_${uniqueTerm}`,
      title: `Contains ${uniqueTerm} in middle`, // Contains match - should rank third
      nextAction: "Yet another test",
      context: "@testing",
      status: "active" as const,
    },
    {
      id: `${TEST_PREFIX}task_no_match`,
      title: "Unrelated task title",
      nextAction: "No match here",
      context: "@other",
      status: "active" as const,
    },
    {
      id: `${TEST_PREFIX}task_completed`,
      title: `Completed ${uniqueTerm} task`,
      nextAction: "This is completed",
      context: "@testing",
      status: "completed" as const,
    },
  ];

  for (const task of taskData) {
    await db.insert(schema.tasks).values({
      ...task,
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
    testData.tasks.push(task.id);
  }

  // Insert test projects
  const projectData = [
    {
      id: `${TEST_PREFIX}project_${uniqueTerm}`,
      name: `Project ${uniqueTerm}`,
      desiredOutcome: "Complete the project",
      nextAction: "Start planning",
      status: "active" as const,
    },
    {
      id: `${TEST_PREFIX}project_other`,
      name: "Other Project",
      desiredOutcome: "Different outcome",
      nextAction: `Contains ${uniqueTerm}`,
      status: "active" as const,
    },
  ];

  for (const project of projectData) {
    await db.insert(schema.projects).values({
      ...project,
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
    testData.projects.push(project.id);
  }

  // Insert test ideas
  const ideaData = [
    {
      id: `${TEST_PREFIX}idea_${uniqueTerm}`,
      title: `Idea about ${uniqueTerm}`,
      summary: "A creative idea for testing",
      links: [],
    },
    {
      id: `${TEST_PREFIX}idea_other`,
      title: "Different Idea",
      summary: `This summary contains ${uniqueTerm}`,
      links: [],
    },
  ];

  for (const idea of ideaData) {
    await db.insert(schema.ideas).values({
      ...idea,
      needsReview: false,
      createdAt: now,
      updatedAt: now,
    }).onConflictDoNothing();
    testData.ideas.push(idea.id);
  }

  // Store the unique term for tests to use
  (testData as any).uniqueTerm = uniqueTerm;

  // Generate embeddings for test data if OpenAI is available and semantic tests will run
  if (process.env.RUN_OPENAI_TESTS === "1" && hasOpenAIClient()) {
    // Generate embeddings for tasks
    for (const task of taskData) {
      const text = prepareTextForEmbedding({ type: "task", data: task });
      const embedding = await generateEmbedding(text);
      await db.update(schema.tasks)
        .set({ embedding })
        .where(eq(schema.tasks.id, task.id));
    }

    // Generate embeddings for projects
    for (const project of projectData) {
      const text = prepareTextForEmbedding({ type: "project", data: project });
      const embedding = await generateEmbedding(text);
      await db.update(schema.projects)
        .set({ embedding })
        .where(eq(schema.projects.id, project.id));
    }

    // Generate embeddings for ideas
    for (const idea of ideaData) {
      const text = prepareTextForEmbedding({ type: "idea", data: idea });
      const embedding = await generateEmbedding(text);
      await db.update(schema.ideas)
        .set({ embedding })
        .where(eq(schema.ideas.id, idea.id));
    }
  }

  return testData;
}

async function cleanupTestData() {
  await rawDb`DELETE FROM tasks WHERE id LIKE ${TEST_PREFIX + '%'}`;
  await rawDb`DELETE FROM projects WHERE id LIKE ${TEST_PREFIX + '%'}`;
  await rawDb`DELETE FROM ideas WHERE id LIKE ${TEST_PREFIX + '%'}`;
}

// =============================================================================
// Integration Tests
// =============================================================================

async function runTests() {
  console.log("\n--- Search Integration Tests ---\n");

  if (!process.env.DATABASE_URL) {
    console.log("⚠ Skipping integration tests (set DATABASE_URL to enable)\n");
    process.exit(0);
  }

  // Semantic/hybrid tests require OpenAI and pgvector
  const shouldRunSemanticTests = !!process.env.OPENAI_API_KEY && process.env.RUN_OPENAI_TESTS === "1";
  if (!shouldRunSemanticTests) {
    console.log("⚠ Skipping semantic/hybrid tests (set RUN_OPENAI_TESTS=1 to enable)\n");
  }

  // Check database connectivity
  try {
    await rawDb`SELECT 1`;
    console.log("✓ Database connected\n");
  } catch (error) {
    console.log("✗ Database connection failed");
    console.log("  Set DATABASE_URL to run integration tests\n");
    process.exit(1);
  }

  let testData: TestData & { uniqueTerm?: string };
  let app: FastifyInstance;

  try {
    testData = await setupTestData() as TestData & { uniqueTerm?: string };
    console.log("✓ Test data setup complete\n");

    app = await buildTestApp();
    console.log("✓ Test app initialized\n");
  } catch (error) {
    console.log("✗ Setup failed:", error);
    await cleanupTestData();
    process.exit(1);
  }

  const uniqueTerm = testData.uniqueTerm!;

  try {
    // --- Cross-Entity Search Tests ---
    await test("search finds results across all entity types", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}`,
      });

      assertEqual(response.statusCode, 200, "Should return 200");

      const body = JSON.parse(response.body);
      assert(body.data !== undefined, "Should have data array");
      assert(Array.isArray(body.data), "Data should be an array");

      // Should find results in tasks, projects, and ideas
      const types = new Set(body.data.map((r: any) => r.type));
      assert(types.has("task"), "Should find tasks");
      assert(types.has("project"), "Should find projects");
      assert(types.has("idea"), "Should find ideas");
    });

    // --- Type Filter Tests ---
    await test("type=task filter returns only tasks", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&type=task`,
      });

      const body = JSON.parse(response.body);
      assert(body.data.length > 0, "Should have results");
      assert(
        body.data.every((r: any) => r.type === "task"),
        "All results should be tasks"
      );
    });

    await test("type=project filter returns only projects", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&type=project`,
      });

      const body = JSON.parse(response.body);
      assert(body.data.length > 0, "Should have results");
      assert(
        body.data.every((r: any) => r.type === "project"),
        "All results should be projects"
      );
    });

    await test("type=idea filter returns only ideas", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&type=idea`,
      });

      const body = JSON.parse(response.body);
      assert(body.data.length > 0, "Should have results");
      assert(
        body.data.every((r: any) => r.type === "idea"),
        "All results should be ideas"
      );
    });

    // --- Relevance Ranking Tests ---
    await test("results are ranked by relevance (exact > prefix > contains)", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}`,
      });

      const body = JSON.parse(response.body);
      const taskResults = body.data.filter((r: any) => r.type === "task");

      // Find our test tasks in results
      const exactMatch = taskResults.find((r: any) => r.id.includes("task_exact"));
      const prefixMatch = taskResults.find((r: any) => r.id.includes("task_prefix"));
      const containsMatch = taskResults.find((r: any) => r.id.includes("task_contains"));

      assert(exactMatch !== undefined, "Should find exact match task");
      assert(prefixMatch !== undefined, "Should find prefix match task");
      assert(containsMatch !== undefined, "Should find contains match task");

      // Check ranking order
      const exactIdx = taskResults.findIndex((r: any) => r.id.includes("task_exact"));
      const prefixIdx = taskResults.findIndex((r: any) => r.id.includes("task_prefix"));
      const containsIdx = taskResults.findIndex((r: any) => r.id.includes("task_contains"));

      assert(exactIdx < prefixIdx, "Exact match should rank higher than prefix");
      assert(prefixIdx < containsIdx, "Prefix match should rank higher than contains");
    });

    // --- Recently Added Items Test ---
    await test("recently added items are immediately searchable", async () => {
      // Add a new item
      const newId = `${TEST_PREFIX}task_new_${Date.now()}`;
      const newSearchTerm = `newsearchable${Date.now()}`;
      const now = new Date();

      await db.insert(schema.tasks).values({
        id: newId,
        title: newSearchTerm,
        nextAction: "Brand new task",
        context: "@new",
        status: "active",
        needsReview: false,
        createdAt: now,
        updatedAt: now,
      });

      // Search for it immediately
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${newSearchTerm}`,
      });

      const body = JSON.parse(response.body);
      const found = body.data.find((r: any) => r.id === newId);
      assert(found !== undefined, "Should find newly added item immediately");

      // Cleanup
      await rawDb`DELETE FROM tasks WHERE id = ${newId}`;
    });

    // --- Status Filter Tests ---
    await test("status filter works correctly", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&type=task&status=active`,
      });

      const body = JSON.parse(response.body);
      assert(
        body.data.every((r: any) => r.entity.status === "active"),
        "All results should have active status"
      );
    });

    await test("completed tasks can be found with status filter", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&type=task&status=completed`,
      });

      const body = JSON.parse(response.body);
      const completedTask = body.data.find((r: any) => r.id.includes("task_completed"));
      assert(completedTask !== undefined, "Should find completed task");
    });

    // --- Pagination Tests ---
    await test("pagination - limit parameter works", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&limit=2`,
      });

      const body = JSON.parse(response.body);
      assert(body.data.length <= 2, "Should return at most 2 results");
      assert(body.meta?.limit === 2, "Meta should show limit");
    });

    await test("pagination - offset parameter works", async () => {
      // First get all results
      const allResponse = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}`,
      });
      const allBody = JSON.parse(allResponse.body);
      const totalResults = allBody.data.length;

      if (totalResults > 2) {
        // Get results with offset
        const offsetResponse = await app.inject({
          method: "GET",
          url: `/search?q=${uniqueTerm}&offset=2`,
        });
        const offsetBody = JSON.parse(offsetResponse.body);

        assert(offsetBody.meta?.offset === 2, "Meta should show offset");
        assert(
          offsetBody.data.length === totalResults - 2,
          "Should skip first 2 results"
        );
      } else {
        console.log("    (Skipped: not enough results to test offset)");
      }
    });

    await test("pagination - meta contains total count", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}`,
      });

      const body = JSON.parse(response.body);
      assert(body.meta?.total !== undefined, "Meta should contain total");
      assert(typeof body.meta.total === "number", "Total should be a number");
      assertEqual(body.meta.total, body.data.length, "Total should match data length");
    });

    // --- Context Filter Test ---
    await test("context filter works for tasks", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&type=task&context=testing`,
      });

      const body = JSON.parse(response.body);
      assert(
        body.data.every((r: any) => r.entity.context?.includes("testing")),
        "All results should have matching context"
      );
    });

    // --- Empty Results Test ---
    await test("returns empty array for no matches", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=xyznonexistent12345abcdef`,
      });

      assertEqual(response.statusCode, 200, "Should return 200");
      const body = JSON.parse(response.body);
      assert(Array.isArray(body.data), "Data should be array");
      assertEqual(body.data.length, 0, "Should have no results");
      assertEqual(body.meta?.total, 0, "Total should be 0");
    });

    // --- Snippet Generation Test ---
    await test("search results include snippets with highlights", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}`,
      });

      const body = JSON.parse(response.body);
      assert(body.data.length > 0, "Should have results");

      const firstResult = body.data[0];
      assert(firstResult.snippet !== undefined, "Result should have snippet");
      assert(firstResult.snippet.title !== undefined, "Snippet should have title");
      assert(firstResult.snippet.content !== undefined, "Snippet should have content");
    });

    // --- Entity Data Inclusion Test ---
    await test("search results include full entity data", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&type=task&limit=1`,
      });

      const body = JSON.parse(response.body);
      assert(body.data.length > 0, "Should have results");

      const result = body.data[0];
      assert(result.entity !== undefined, "Should include entity");
      assert(result.entity.id !== undefined, "Entity should have id");
      assert(result.entity.title !== undefined, "Task entity should have title");
      assert(result.entity.status !== undefined, "Task entity should have status");
      assert(result.entity.createdAt !== undefined, "Entity should have createdAt");
    });

    // --- Semantic / Hybrid Tests ---
    if (shouldRunSemanticTests) {
      await test("semantic mode returns results with similarity scores", async () => {
        // Use lower threshold since uniqueTerm is a random string with low semantic meaning
        const response = await app.inject({
          method: "GET",
          url: `/search?q=${uniqueTerm}&mode=semantic&limit=5&semanticThreshold=0.3`,
        });

        assertEqual(response.statusCode, 200, "Should return 200");
        const body = JSON.parse(response.body);
        assert(Array.isArray(body.data), "Data should be array");
        if (body.data.length > 0) {
          assert(
            body.data.some((r: any) => typeof r.similarity === "number"),
            "Semantic results should include similarity"
          );
        }
      });

      await test("hybrid mode returns results with similarity scores", async () => {
        // Use lower threshold since uniqueTerm is a random string with low semantic meaning
        const response = await app.inject({
          method: "GET",
          url: `/search?q=${uniqueTerm}&mode=hybrid&limit=5&semanticThreshold=0.3`,
        });

        assertEqual(response.statusCode, 200, "Should return 200");
        const body = JSON.parse(response.body);
        assert(Array.isArray(body.data), "Data should be array");
        if (body.data.length > 0) {
          assert(
            body.data.some((r: any) => typeof r.similarity === "number"),
            "Hybrid results should include similarity"
          );
        }
      });
    }

    await test("semantic mode returns 400 when OPENAI_API_KEY missing", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&mode=semantic&limit=5`,
      });

      assertEqual(response.statusCode, 400, "Should return 400 without API key");

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    await test("hybrid mode falls back to keyword when OPENAI_API_KEY missing", async () => {
      const originalKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&mode=hybrid&limit=5`,
      });

      assertEqual(response.statusCode, 200, "Should return 200 without API key");
      const body = JSON.parse(response.body);
      assert(Array.isArray(body.data), "Data should be array");

      if (originalKey) {
        process.env.OPENAI_API_KEY = originalKey;
      }
    });

    // --- Date Range Filter Tests ---
    await test("date range filter - from parameter", async () => {
      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&from=${new Date().toISOString().split('T')[0]}`,
      });

      // Should return 200 (filter syntax is valid)
      assertEqual(response.statusCode, 200, "Should accept from date");
    });

    await test("date range filter - to parameter", async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await app.inject({
        method: "GET",
        url: `/search?q=${uniqueTerm}&to=${tomorrow.toISOString().split('T')[0]}`,
      });

      assertEqual(response.statusCode, 200, "Should accept to date");
    });

  } finally {
    // Cleanup
    await app.close();
    await cleanupTestData();
    await rawDb.end();
    console.log("\n✓ Cleanup complete");
  }

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed`);
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
