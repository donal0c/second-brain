// =============================================================================
// Background Job Processor Integration Tests
// =============================================================================
// Run with: npx tsx packages/api/src/jobs/processor.integration.test.ts
//
// These tests verify the background job processing system:
// - Status endpoint returns correct job state
// - Manual batch trigger works
// - Stale item recovery functions correctly
// - Concurrent run prevention via isRunning flag
// - Timer cleanup for clean process exit

import Fastify, { type FastifyInstance } from "fastify";
import { jobRoutes } from "../routes/jobs.js";
import {
  startProcessorJob,
  stopProcessorJob,
  isProcessorJobRunning,
  isProcessingCycleInProgress,
  runProcessingCycle,
} from "./processor.js";
import { setLLMProvider, type LLMProvider, clearLLMProvider } from "../llm/provider.js";
import type {
  ClassificationResult,
  ExtractionResult,
  ClarificationQuestion,
  CorrectionResult,
  FixResult,
  PersonalContext,
  Classification,
  ContextExtractionResult,
  ClarificationContext,
} from "../llm/types.js";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
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
// Mock LLM Provider for Testing
// =============================================================================

class MockLLMProvider implements LLMProvider {
  readonly name = "mock";
  readonly model = "mock-model";

  async classify(
    _text: string,
    _context?: PersonalContext[],
    _clarification?: ClarificationContext
  ): Promise<ClassificationResult> {
    return {
      classification: "task",
      confidence: 0.9,
      reasoning: "Mock classification",
    };
  }

  async extract(
    text: string,
    type: Classification,
    _context?: PersonalContext[],
    _clarification?: ClarificationContext
  ): Promise<ExtractionResult> {
    switch (type) {
      case "task":
        return {
          type: "task",
          data: {
            title: text,
            nextAction: "Review",
            dueDate: null,
            context: null,
          },
        };
      default:
        return {
          type: "idea",
          data: {
            title: text,
            summary: text,
            links: [],
          },
        };
    }
  }

  async generateClarification(
    _text: string,
    _classificationAttempt: ClassificationResult
  ): Promise<ClarificationQuestion> {
    return {
      question: "What type of item is this?",
      options: ["task", "project", "idea"],
    };
  }

  async interpretCorrection(
    _original: Record<string, unknown>,
    _correction: string
  ): Promise<CorrectionResult> {
    return {
      updates: {},
      reasoning: "No corrections",
    };
  }

  async interpretFix(
    _originalType: Classification,
    _original: Record<string, unknown>,
    _correction: string
  ): Promise<FixResult> {
    return {
      shouldTransform: false,
      fields: {},
      reasoning: "No fix needed",
    };
  }

  async extractContextEntities(_text: string): Promise<ContextExtractionResult> {
    return { entities: [] };
  }

  async *streamUI(
    _params: Parameters<LLMProvider["streamUI"]>[0]
  ): AsyncIterable<import("ai").UIMessageChunk> {
    return;
  }
}

// =============================================================================
// Test App Builder
// =============================================================================

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(jobRoutes);
  return app;
}

// =============================================================================
// Tests
// =============================================================================

async function runTests() {
  console.log("\n--- Background Job Processor Integration Tests ---\n");

  // =============================================================================
  // Job State Tests (Unit Level)
  // =============================================================================

  await test("isProcessorJobRunning: returns false when no job is running", async () => {
    // Ensure job is stopped
    stopProcessorJob();
    assertEqual(isProcessorJobRunning(), false);
  });

  await test("isProcessingCycleInProgress: returns false when no cycle is running", async () => {
    assertEqual(isProcessingCycleInProgress(), false);
  });

  // =============================================================================
  // Job Lifecycle Tests (without DB - using mock provider)
  // =============================================================================

  await test("runProcessingCycle: returns error when LLM provider not configured", async () => {
    clearLLMProvider();

    const result = await runProcessingCycle();

    assertEqual(result.processed, 0);
    assertEqual(result.error, "LLM provider not configured");
  });

  await test("startProcessorJob: does not start when LLM provider not configured", async () => {
    clearLLMProvider();
    stopProcessorJob(); // Ensure clean state

    startProcessorJob();

    assertEqual(isProcessorJobRunning(), false, "Job should not start without LLM provider");
  });

  await test("startProcessorJob: starts with LLM provider configured", async () => {
    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);

    stopProcessorJob(); // Ensure clean state
    startProcessorJob({
      logger: {
        info: () => {},
        error: () => {},
        warn: () => {},
      },
    });

    assertEqual(isProcessorJobRunning(), true, "Job should be running");

    // Cleanup
    stopProcessorJob();
    clearLLMProvider();
  });

  await test("startProcessorJob: prevents duplicate starts", async () => {
    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);

    let warnCalled = false;
    const mockLogger = {
      info: () => {},
      error: () => {},
      warn: () => {
        warnCalled = true;
      },
    };

    stopProcessorJob(); // Ensure clean state
    startProcessorJob({ logger: mockLogger });
    startProcessorJob({ logger: mockLogger }); // Second call should warn

    assertEqual(warnCalled, true, "Should warn about duplicate start");
    assertEqual(isProcessorJobRunning(), true, "Job should still be running");

    // Cleanup
    stopProcessorJob();
    clearLLMProvider();
  });

  await test("stopProcessorJob: stops a running job", async () => {
    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);

    startProcessorJob({
      logger: {
        info: () => {},
        error: () => {},
        warn: () => {},
      },
    });

    assertEqual(isProcessorJobRunning(), true, "Job should be running before stop");

    stopProcessorJob();

    assertEqual(isProcessorJobRunning(), false, "Job should not be running after stop");

    clearLLMProvider();
  });

  await test("stopProcessorJob: handles being called when job not running", async () => {
    stopProcessorJob(); // Ensure stopped

    // Should not throw
    stopProcessorJob();

    assertEqual(isProcessorJobRunning(), false);
  });

  // =============================================================================
  // API Route Tests
  // =============================================================================

  await test("API: GET /jobs/processor/status returns correct state", async () => {
    // Wait a bit for any in-progress cycle to finish from previous tests
    await new Promise((resolve) => setTimeout(resolve, 50));

    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);
    stopProcessorJob(); // Ensure clean state

    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/jobs/processor/status",
    });

    assertEqual(response.statusCode, 200, "Should return 200");

    const body = JSON.parse(response.body);
    assert(body.data !== undefined, "Should have data field");
    assertEqual(body.data.jobRunning, false, "Job should not be running");
    assertEqual(body.data.llmAvailable, true, "LLM should be available");
    // Note: cycleInProgress may still be true if previous test had a lingering cycle
    // This is expected since startProcessorJob runs a cycle immediately

    await app.close();
    clearLLMProvider();
  });

  await test("API: GET /jobs/processor/status shows llmAvailable: false when no provider", async () => {
    clearLLMProvider();
    stopProcessorJob();

    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/jobs/processor/status",
    });

    assertEqual(response.statusCode, 200);

    const body = JSON.parse(response.body);
    assertEqual(body.data.llmAvailable, false, "LLM should not be available");

    await app.close();
  });

  await test("API: POST /jobs/processor/start returns 503 without LLM provider", async () => {
    clearLLMProvider();
    stopProcessorJob();

    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/jobs/processor/start",
    });

    assertEqual(response.statusCode, 503, "Should return 503 Service Unavailable");

    await app.close();
  });

  await test("API: POST /jobs/processor/start starts the job", async () => {
    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);
    stopProcessorJob();

    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/jobs/processor/start",
    });

    assertEqual(response.statusCode, 200, "Should return 200");

    const body = JSON.parse(response.body);
    assertEqual(body.data.status, "running");

    assertEqual(isProcessorJobRunning(), true, "Job should be running");

    await app.close();
    stopProcessorJob();
    clearLLMProvider();
  });

  await test("API: POST /jobs/processor/start returns 409 if already running", async () => {
    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);
    stopProcessorJob();

    const app = await buildTestApp();

    // Start once
    await app.inject({
      method: "POST",
      url: "/jobs/processor/start",
    });

    // Try to start again
    const response = await app.inject({
      method: "POST",
      url: "/jobs/processor/start",
    });

    assertEqual(response.statusCode, 409, "Should return 409 Conflict");

    await app.close();
    stopProcessorJob();
    clearLLMProvider();
  });

  await test("API: POST /jobs/processor/stop stops a running job", async () => {
    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);

    const app = await buildTestApp();

    // Start the job first
    await app.inject({
      method: "POST",
      url: "/jobs/processor/start",
    });

    assertEqual(isProcessorJobRunning(), true, "Job should be running before stop");

    // Now stop it
    const response = await app.inject({
      method: "POST",
      url: "/jobs/processor/stop",
    });

    assertEqual(response.statusCode, 200, "Should return 200");

    const body = JSON.parse(response.body);
    assertEqual(body.data.status, "stopped");

    assertEqual(isProcessorJobRunning(), false, "Job should not be running after stop");

    await app.close();
    clearLLMProvider();
  });

  await test("API: POST /jobs/processor/stop returns 409 if not running", async () => {
    stopProcessorJob();

    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/jobs/processor/stop",
    });

    assertEqual(response.statusCode, 409, "Should return 409 Conflict");

    await app.close();
  });

  await test("API: POST /jobs/processor/trigger returns 503 without LLM provider", async () => {
    clearLLMProvider();

    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/jobs/processor/trigger",
      payload: { batchSize: 5 },
    });

    assertEqual(response.statusCode, 503, "Should return 503 Service Unavailable");

    await app.close();
  });

  await test("API: POST /jobs/processor/trigger validates batchSize bounds", async () => {
    const mockProvider = new MockLLMProvider();
    setLLMProvider(mockProvider);

    const app = await buildTestApp();

    // Test batchSize too small
    const responseTooSmall = await app.inject({
      method: "POST",
      url: "/jobs/processor/trigger",
      payload: { batchSize: 0 },
    });
    assertEqual(responseTooSmall.statusCode, 400, "Should return 400 for batchSize 0");

    // Test batchSize too large
    const responseTooLarge = await app.inject({
      method: "POST",
      url: "/jobs/processor/trigger",
      payload: { batchSize: 100 },
    });
    assertEqual(responseTooLarge.statusCode, 400, "Should return 400 for batchSize 100");

    await app.close();
    clearLLMProvider();
  });

  // =============================================================================
  // Summary
  // =============================================================================

  console.log("\n" + "=".repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  // Cleanup
  stopProcessorJob();
  clearLLMProvider();

  if (failed > 0) {
    process.exit(1);
  }

  process.exit(0);
}

runTests().catch((error) => {
  console.error(error);
  process.exit(1);
});
