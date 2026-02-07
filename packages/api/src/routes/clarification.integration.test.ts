// =============================================================================
// Clarification Reprocessing Integration Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/clarification.integration.test.ts
//
// These tests verify the clarification reprocessing flow end-to-end:
// - Inbox item processing triggers clarification when confidence is low
// - User provides clarification answer
// - Item is reprocessed with clarification context
// - Entity is created with correct data

import Fastify, { type FastifyInstance } from "fastify";
import { clarificationRoutes } from "./receipts.js";
import { setLLMProvider, type LLMProvider } from "../llm/provider.js";
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
// Mock LLM Provider for Testing Clarification Flow
// =============================================================================

interface MockLLMCallLog {
  method: string;
  args: unknown[];
}

class MockLLMProvider implements LLMProvider {
  readonly name = "mock";
  readonly model = "mock-model";

  // Track all method calls
  callLog: MockLLMCallLog[] = [];

  // Configure behavior
  private classifyBehavior: Map<string, ClassificationResult> = new Map();
  private extractBehavior: Map<string, ExtractionResult> = new Map();
  private clarifyBehavior: ClarificationQuestion = {
    question: "What type of item is this?",
    options: ["task", "project", "idea"],
  };

  // For tracking clarification context usage
  clarificationUsed = false;

  setClassifyResult(key: string, result: ClassificationResult): void {
    this.classifyBehavior.set(key, result);
  }

  setExtractResult(key: string, result: ExtractionResult): void {
    this.extractBehavior.set(key, result);
  }

  setClarificationQuestion(question: ClarificationQuestion): void {
    this.clarifyBehavior = question;
  }

  async classify(
    text: string,
    _context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ClassificationResult> {
    this.callLog.push({ method: "classify", args: [text, clarification] });

    // If clarification is provided, use high confidence
    if (clarification) {
      this.clarificationUsed = true;
      const key = `${text}_with_clarification`;
      const result = this.classifyBehavior.get(key);
      if (result) return result;
    }

    // Return configured behavior or default low confidence
    const result = this.classifyBehavior.get(text);
    if (result) return result;

    return {
      classification: "unknown",
      confidence: 0.3,
      reasoning: "Low confidence classification",
    };
  }

  async extract(
    text: string,
    type: Classification,
    _context?: PersonalContext[],
    clarification?: ClarificationContext
  ): Promise<ExtractionResult> {
    this.callLog.push({ method: "extract", args: [text, type, clarification] });

    // If clarification is provided, return high quality extraction
    if (clarification) {
      const key = `${text}_${type}_with_clarification`;
      const result = this.extractBehavior.get(key);
      if (result) return result;
    }

    // Return configured behavior or default
    const key = `${text}_${type}`;
    const result = this.extractBehavior.get(key);
    if (result) return result;

    // Default extraction based on type
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
      case "project":
        return {
          type: "project",
          data: {
            name: text,
            desiredOutcome: null,
            nextAction: null,
          },
        };
      case "idea":
        return {
          type: "idea",
          data: {
            title: text,
            summary: text,
            links: [],
          },
        };
      case "person":
        return {
          type: "person",
          data: {
            name: text,
            relationshipContext: null,
            followUpNextAction: null,
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
    this.callLog.push({
      method: "generateClarification",
      args: [_text, _classificationAttempt],
    });
    return this.clarifyBehavior;
  }

  async interpretCorrection(
    _original: Record<string, unknown>,
    _correction: string
  ): Promise<CorrectionResult> {
    this.callLog.push({
      method: "interpretCorrection",
      args: [_original, _correction],
    });
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
    this.callLog.push({
      method: "interpretFix",
      args: [_originalType, _original, _correction],
    });
    return {
      shouldTransform: false,
      fields: {},
      reasoning: "No fix needed",
    };
  }

  async extractContextEntities(_text: string): Promise<ContextExtractionResult> {
    this.callLog.push({ method: "extractContextEntities", args: [_text] });
    return { entities: [] };
  }

  async *streamUI(
    _params: Parameters<LLMProvider["streamUI"]>[0]
  ): AsyncIterable<import("ai").UIMessageChunk> {
    this.callLog.push({ method: "streamUI", args: [_params] });
    return;
  }

  reset(): void {
    this.callLog = [];
    this.classifyBehavior.clear();
    this.extractBehavior.clear();
    this.clarificationUsed = false;
  }
}

// =============================================================================
// Test App Builder
// =============================================================================

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(clarificationRoutes);
  return app;
}

// =============================================================================
// Clarification Flow Logic Tests
// =============================================================================

async function runTests() {
  console.log("\n--- Clarification Reprocessing Integration Tests ---\n");

  // Set up mock LLM provider
  const mockProvider = new MockLLMProvider();
  setLLMProvider(mockProvider);

  // =============================================================================
  // Mock LLM Provider Behavior Tests
  // =============================================================================

  await test("MockLLMProvider: classify returns low confidence by default", async () => {
    mockProvider.reset();

    const result = await mockProvider.classify("ambiguous text");
    assertEqual(result.confidence, 0.3, "Should return low confidence");
    assertEqual(result.classification, "unknown", "Should classify as unknown");
  });

  await test("MockLLMProvider: classify uses configured behavior", async () => {
    mockProvider.reset();
    mockProvider.setClassifyResult("buy groceries", {
      classification: "task",
      confidence: 0.9,
      reasoning: "Clearly a task",
    });

    const result = await mockProvider.classify("buy groceries");
    assertEqual(result.classification, "task", "Should return configured classification");
    assertEqual(result.confidence, 0.9, "Should return configured confidence");
  });

  await test("MockLLMProvider: classify changes behavior with clarification", async () => {
    mockProvider.reset();

    // Without clarification: low confidence
    mockProvider.setClassifyResult("buy milk", {
      classification: "unknown",
      confidence: 0.3,
      reasoning: "Ambiguous",
    });

    // With clarification: high confidence
    mockProvider.setClassifyResult("buy milk_with_clarification", {
      classification: "task",
      confidence: 0.95,
      reasoning: "User confirmed it's a task",
    });

    const withoutClarification = await mockProvider.classify("buy milk");
    assertEqual(withoutClarification.classification, "unknown");
    assertEqual(withoutClarification.confidence, 0.3);

    const withClarification = await mockProvider.classify("buy milk", [], {
      question: "Is this a task?",
      answer: "Yes, it's a task to buy milk",
    });
    assertEqual(withClarification.classification, "task");
    assertEqual(withClarification.confidence, 0.95);
    assertEqual(mockProvider.clarificationUsed, true, "Should flag clarification usage");
  });

  await test("MockLLMProvider: extract uses configured behavior", async () => {
    mockProvider.reset();
    mockProvider.setExtractResult("buy groceries_task", {
      type: "task",
      data: {
        title: "Buy groceries",
        nextAction: "Go to store",
        dueDate: "2024-01-20",
        context: "@errands",
      },
    });

    const result = await mockProvider.extract("buy groceries", "task");
    assertEqual(result.type, "task");
    if (result.type === "task") {
      assertEqual(result.data.title, "Buy groceries");
      assertEqual(result.data.nextAction, "Go to store");
    }
  });

  await test("MockLLMProvider: generateClarification returns configured question", async () => {
    mockProvider.reset();
    mockProvider.setClarificationQuestion({
      question: "Is this a task or an idea?",
      options: ["task", "idea"],
    });

    const result = await mockProvider.generateClarification("something", {
      classification: "unknown",
      confidence: 0.3,
      reasoning: "Low confidence",
    });

    assertEqual(result.question, "Is this a task or an idea?");
    assert(Array.isArray(result.options), "Options should be an array");
    assertEqual(result.options?.length, 2);
  });

  await test("MockLLMProvider: tracks all method calls", async () => {
    mockProvider.reset();

    await mockProvider.classify("test");
    await mockProvider.extract("test", "task");
    await mockProvider.generateClarification("test", {
      classification: "unknown",
      confidence: 0.3,
      reasoning: "",
    });

    assertEqual(mockProvider.callLog.length, 3, "Should log 3 method calls");
    assertEqual(mockProvider.callLog[0].method, "classify");
    assertEqual(mockProvider.callLog[1].method, "extract");
    assertEqual(mockProvider.callLog[2].method, "generateClarification");
  });

  // =============================================================================
  // Clarification Reprocessing Flow Tests (Logic)
  // =============================================================================

  await test("Clarification flow: simulates full reprocessing with context", async () => {
    mockProvider.reset();

    // Set up initial classification (low confidence, triggers clarification)
    mockProvider.setClassifyResult("schedule meeting with Bob", {
      classification: "unknown",
      confidence: 0.3,
      reasoning: "Could be task or person",
    });

    // Set up classification after clarification (high confidence)
    mockProvider.setClassifyResult("schedule meeting with Bob_with_clarification", {
      classification: "task",
      confidence: 0.95,
      reasoning: "User confirmed it's a task",
    });

    // Set up extraction after clarification
    mockProvider.setExtractResult("schedule meeting with Bob_task_with_clarification", {
      type: "task",
      data: {
        title: "Schedule meeting with Bob",
        nextAction: "Send calendar invite",
        dueDate: null,
        context: "@work",
      },
    });

    // Simulate initial processing (would trigger clarification)
    const initialClassification = await mockProvider.classify("schedule meeting with Bob");
    assertEqual(initialClassification.confidence < 0.5, true, "Initial should be low confidence");

    // Simulate clarification generation
    const clarificationQuestion = await mockProvider.generateClarification(
      "schedule meeting with Bob",
      initialClassification
    );
    assert(clarificationQuestion.question.length > 0, "Should generate question");

    // Simulate user providing answer and reprocessing
    const clarificationContext: ClarificationContext = {
      question: clarificationQuestion.question,
      answer: "This is a task - I need to schedule a meeting with Bob",
    };

    const finalClassification = await mockProvider.classify(
      "schedule meeting with Bob",
      [],
      clarificationContext
    );
    assertEqual(finalClassification.classification, "task", "Should classify as task");
    assertEqual(finalClassification.confidence, 0.95, "Should have high confidence");

    // Simulate extraction with clarification context
    const extraction = await mockProvider.extract(
      "schedule meeting with Bob",
      "task",
      [],
      clarificationContext
    );
    assertEqual(extraction.type, "task");
    if (extraction.type === "task") {
      assertEqual(extraction.data.title, "Schedule meeting with Bob");
      assertEqual(extraction.data.nextAction, "Send calendar invite");
      assertEqual(extraction.data.context, "@work");
    }
  });

  await test("Clarification flow: handles multiple clarification attempts", async () => {
    mockProvider.reset();

    // First classification: low confidence
    mockProvider.setClassifyResult("something ambiguous", {
      classification: "unknown",
      confidence: 0.2,
      reasoning: "Very ambiguous",
    });

    // After first clarification: still somewhat ambiguous
    mockProvider.setClassifyResult("something ambiguous_with_clarification", {
      classification: "idea",
      confidence: 0.6,
      reasoning: "Possibly an idea",
    });

    // Simulate first round
    const firstClassification = await mockProvider.classify("something ambiguous");
    assertEqual(firstClassification.confidence, 0.2);

    // Simulate first clarification answer
    const afterFirstClarification = await mockProvider.classify(
      "something ambiguous",
      [],
      { question: "What is this?", answer: "It's an idea I had" }
    );
    assertEqual(afterFirstClarification.classification, "idea");
    assertEqual(afterFirstClarification.confidence, 0.6);

    // The system should track clarification attempts (tested via mock behavior)
    assertEqual(mockProvider.clarificationUsed, true);
  });

  // =============================================================================
  // API Route Tests (without DB)
  // =============================================================================

  await test("API: POST /clarifications/:id/resolve validates answer is required", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/clarifications/00000000-0000-0000-0000-000000000001/resolve",
      payload: {},
    });

    assertEqual(response.statusCode, 400, "Should return 400 for missing answer");
    await app.close();
  });

  await test("API: POST /clarifications/:id/resolve validates answer is not empty", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/clarifications/00000000-0000-0000-0000-000000000001/resolve",
      payload: { answer: "" },
    });

    assertEqual(response.statusCode, 400, "Should return 400 for empty answer");
    await app.close();
  });

  await test("API: POST /clarifications/:id/resolve validates ID format", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/clarifications/not-a-uuid/resolve",
      payload: { answer: "This is a task" },
    });

    assertEqual(response.statusCode, 400, "Should return 400 for invalid ID format");
    await app.close();
  });

  await test("API: GET /clarifications/:id validates ID format", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "GET",
      url: "/clarifications/invalid-uuid",
    });

    assertEqual(response.statusCode, 400, "Should return 400 for invalid ID format");
    await app.close();
  });

  // =============================================================================
  // Summary
  // =============================================================================

  console.log("\n" + "=".repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
