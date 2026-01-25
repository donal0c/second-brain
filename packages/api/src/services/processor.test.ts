// =============================================================================
// Processor Branching Logic Tests
// =============================================================================
// Run with: npx tsx packages/api/src/services/processor.test.ts
//
// These tests verify the branching logic in the processor pipeline:
// - Action mapping (file/flag/clarify)
// - Error sanitization
// - Validation clarification question generation
// - Best-effort extraction for circuit breaker

import {
  mapAction,
  sanitizeErrorMessage,
  buildValidationClarificationQuestion,
  buildBestEffortExtraction,
  shouldEmbedPersonalContextOnInsert,
} from "./processor.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
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
// mapAction Tests
// =============================================================================

test("mapAction: maps 'file' to 'filed'", () => {
  assertEqual(mapAction("file"), "filed");
});

test("mapAction: maps 'flag' to 'flagged'", () => {
  assertEqual(mapAction("flag"), "flagged");
});

test("mapAction: maps 'clarify' to 'clarify'", () => {
  assertEqual(mapAction("clarify"), "clarify");
});

// =============================================================================
// sanitizeErrorMessage Tests
// =============================================================================

test("sanitizeErrorMessage: allows LLM_JSON_PARSE_ERROR prefix", () => {
  const msg = "LLM_JSON_PARSE_ERROR: Failed to parse JSON response";
  const result = sanitizeErrorMessage(msg);
  assert(result.startsWith("LLM_JSON_PARSE_ERROR"), "Should keep safe prefix");
});

test("sanitizeErrorMessage: allows ANTHROPIC_API_ERROR prefix", () => {
  const msg = "ANTHROPIC_API_ERROR: Rate limit exceeded";
  const result = sanitizeErrorMessage(msg);
  assert(result.startsWith("ANTHROPIC_API_ERROR"), "Should keep safe prefix");
});

test("sanitizeErrorMessage: allows VALIDATION_ERROR prefix", () => {
  const msg = "VALIDATION_ERROR: Missing required field";
  const result = sanitizeErrorMessage(msg);
  assert(result.startsWith("VALIDATION_ERROR"), "Should keep safe prefix");
});

test("sanitizeErrorMessage: allows PROCESSING_TIMEOUT prefix", () => {
  const msg = "PROCESSING_TIMEOUT: Request timed out after 30s";
  const result = sanitizeErrorMessage(msg);
  assert(result.startsWith("PROCESSING_TIMEOUT"), "Should keep safe prefix");
});

test("sanitizeErrorMessage: allows CONTEXT_FETCH_ERROR prefix", () => {
  const msg = "CONTEXT_FETCH_ERROR: Failed to load personal contexts";
  const result = sanitizeErrorMessage(msg);
  assert(result.startsWith("CONTEXT_FETCH_ERROR"), "Should keep safe prefix");
});

test("sanitizeErrorMessage: sanitizes unknown error messages", () => {
  const msg = "Error: User data leaked - Call mom about dentist appointment";
  const result = sanitizeErrorMessage(msg);
  assertEqual(result, "PROCESSING_ERROR: An error occurred during processing");
});

test("sanitizeErrorMessage: sanitizes generic error messages", () => {
  const msg = "Something went wrong with processing user input: buy groceries";
  const result = sanitizeErrorMessage(msg);
  assertEqual(result, "PROCESSING_ERROR: An error occurred during processing");
});

test("sanitizeErrorMessage: truncates long safe messages to 200 chars", () => {
  const longMsg = "LLM_JSON_PARSE_ERROR: " + "a".repeat(300);
  const result = sanitizeErrorMessage(longMsg);
  assertEqual(result.length, 200, "Should truncate to 200 characters");
  assert(result.startsWith("LLM_JSON_PARSE_ERROR"), "Should keep safe prefix");
});

// =============================================================================
// Personal Context Embedding Tests
// =============================================================================

test("shouldEmbedPersonalContextOnInsert returns true for new insert", () => {
  assert(shouldEmbedPersonalContextOnInsert("new-id", "new-id"), "Should embed on insert");
});

test("shouldEmbedPersonalContextOnInsert returns false for updates", () => {
  assert(!shouldEmbedPersonalContextOnInsert("new-id", "existing-id"), "Should skip on update");
});

// =============================================================================
// buildValidationClarificationQuestion Tests
// =============================================================================

test("buildValidationClarificationQuestion: generates question for single field error", () => {
  const errors = [{ path: "data.title", message: "Required" }];
  const result = buildValidationClarificationQuestion(errors, "task", "buy milk");
  assert(result.question.includes("title"), "Question should mention the field");
  assert(result.question.includes("task"), "Question should mention entity type");
  assert(result.question.includes("buy milk"), "Question should include raw text");
  assertEqual(result.options, null, "Should return null options for free-form answer");
});

test("buildValidationClarificationQuestion: generates question for multiple field errors", () => {
  const errors = [
    { path: "data.title", message: "Required" },
    { path: "data.nextAction", message: "Required" },
  ];
  const result = buildValidationClarificationQuestion(errors, "task", "something");
  assert(result.question.includes("title"), "Question should mention title");
  assert(result.question.includes("nextAction"), "Question should mention nextAction");
});

test("buildValidationClarificationQuestion: deduplicates field names", () => {
  const errors = [
    { path: "data.title", message: "Too short" },
    { path: "data.title", message: "Cannot be empty" },
  ];
  const result = buildValidationClarificationQuestion(errors, "task", "x");
  // Should only mention title once, not twice
  const titleMatches = result.question.match(/title/g);
  assertEqual(titleMatches?.length, 2, "Should only have two mentions of title"); // one in field list, one in prompt
});

test("buildValidationClarificationQuestion: truncates long raw text", () => {
  const longText = "a".repeat(200);
  const result = buildValidationClarificationQuestion(
    [{ path: "data.title", message: "Required" }],
    "task",
    longText
  );
  assert(result.question.includes("..."), "Should truncate with ellipsis");
  assert(result.question.length < 500, "Question should be reasonably short");
});

test("buildValidationClarificationQuestion: handles path without dots", () => {
  const errors = [{ path: "title", message: "Required" }];
  const result = buildValidationClarificationQuestion(errors, "idea", "test");
  assert(result.question.includes("title"), "Should extract field name from simple path");
});

// =============================================================================
// buildBestEffortExtraction Tests - Task
// =============================================================================

test("buildBestEffortExtraction: creates task with raw text as title", () => {
  const result = buildBestEffortExtraction("Buy groceries", "task");
  assertEqual(result.type, "task");
  if (result.type === "task") {
    assertEqual(result.data.title, "Buy groceries");
    assertEqual(result.data.nextAction, "Review and clarify this item");
    assertEqual(result.data.context, "needs-review");
  }
});

test("buildBestEffortExtraction: uses partial data for task when available", () => {
  const result = buildBestEffortExtraction("test", "task", {
    title: "Partial Title",
    nextAction: "Partial Action",
  });
  assertEqual(result.type, "task");
  if (result.type === "task") {
    assertEqual(result.data.title, "Partial Title");
    assertEqual(result.data.nextAction, "Partial Action");
  }
});

test("buildBestEffortExtraction: truncates long raw text for task title", () => {
  const longText = "a".repeat(150);
  const result = buildBestEffortExtraction(longText, "task");
  if (result.type === "task") {
    assert(result.data.title.length <= 103, "Should truncate title to ~100 chars + ellipsis");
    assert(result.data.title.endsWith("..."), "Should end with ellipsis");
  }
});

// =============================================================================
// buildBestEffortExtraction Tests - Project
// =============================================================================

test("buildBestEffortExtraction: creates project with raw text as name", () => {
  const result = buildBestEffortExtraction("Website Redesign", "project");
  assertEqual(result.type, "project");
  if (result.type === "project") {
    assertEqual(result.data.name, "Website Redesign");
    assertEqual(result.data.nextAction, "Review and clarify this item");
  }
});

test("buildBestEffortExtraction: uses partial data for project when available", () => {
  const result = buildBestEffortExtraction("test", "project", {
    name: "My Project",
    desiredOutcome: "Ship it",
  });
  assertEqual(result.type, "project");
  if (result.type === "project") {
    assertEqual(result.data.name, "My Project");
    assertEqual(result.data.desiredOutcome, "Ship it");
  }
});

// =============================================================================
// buildBestEffortExtraction Tests - Idea
// =============================================================================

test("buildBestEffortExtraction: creates idea with raw text as title and summary", () => {
  const result = buildBestEffortExtraction("App concept for note-taking", "idea");
  assertEqual(result.type, "idea");
  if (result.type === "idea") {
    assertEqual(result.data.title, "App concept for note-taking");
    assertEqual(result.data.summary, "App concept for note-taking");
    assert(Array.isArray(result.data.links), "Links should be an array");
    assertEqual(result.data.links.length, 0, "Links should be empty");
  }
});

test("buildBestEffortExtraction: uses partial data for idea when available", () => {
  const result = buildBestEffortExtraction("test", "idea", {
    title: "My Idea",
    links: ["https://example.com"],
  });
  assertEqual(result.type, "idea");
  if (result.type === "idea") {
    assertEqual(result.data.title, "My Idea");
    assertEqual(result.data.links[0], "https://example.com");
  }
});

// =============================================================================
// buildBestEffortExtraction Tests - Person
// =============================================================================

test("buildBestEffortExtraction: creates person with raw text as name", () => {
  const result = buildBestEffortExtraction("John Smith from marketing", "person");
  assertEqual(result.type, "person");
  if (result.type === "person") {
    assertEqual(result.data.name, "John Smith from marketing");
    assertEqual(result.data.followUpNextAction, "Review and clarify this item");
  }
});

test("buildBestEffortExtraction: uses partial data for person when available", () => {
  const result = buildBestEffortExtraction("test", "person", {
    name: "Jane Doe",
    relationshipContext: "Colleague",
  });
  assertEqual(result.type, "person");
  if (result.type === "person") {
    assertEqual(result.data.name, "Jane Doe");
    assertEqual(result.data.relationshipContext, "Colleague");
  }
});

// =============================================================================
// buildBestEffortExtraction Tests - Unknown/Default
// =============================================================================

test("buildBestEffortExtraction: defaults to idea for unknown classification", () => {
  const result = buildBestEffortExtraction("Random text", "unknown");
  assertEqual(result.type, "idea");
  if (result.type === "idea") {
    assertEqual(result.data.title, "Random text");
  }
});

test("buildBestEffortExtraction: defaults to idea for invalid classification", () => {
  const result = buildBestEffortExtraction("Random text", "invalid_type");
  assertEqual(result.type, "idea");
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
