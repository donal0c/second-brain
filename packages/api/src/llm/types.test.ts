// =============================================================================
// Extraction Validation Tests
// =============================================================================
// Run with: npx tsx packages/api/src/llm/types.test.ts

import { validateExtractionResult } from "./types.js";

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

// =============================================================================
// Valid Extraction Tests
// =============================================================================

test("validates valid task extraction", () => {
  const result = validateExtractionResult({
    type: "task",
    data: {
      title: "Buy groceries",
      nextAction: "Go to the store",
      dueDate: "2024-01-15",
      context: "@errands",
    },
  });
  assert(result.success === true, "Should succeed");
});

test("validates valid task extraction with null optional fields", () => {
  const result = validateExtractionResult({
    type: "task",
    data: {
      title: "Simple task",
      nextAction: "Do the thing",
      dueDate: null,
      context: null,
    },
  });
  assert(result.success === true, "Should succeed with null optional fields");
});

test("validates valid project extraction", () => {
  const result = validateExtractionResult({
    type: "project",
    data: {
      name: "Website Redesign",
      desiredOutcome: "Launch new site",
      nextAction: "Create wireframes",
    },
  });
  assert(result.success === true, "Should succeed");
});

test("validates valid idea extraction", () => {
  const result = validateExtractionResult({
    type: "idea",
    data: {
      title: "App concept",
      summary: "An app that does things",
      links: ["https://example.com"],
    },
  });
  assert(result.success === true, "Should succeed");
});

test("validates valid idea extraction with empty links", () => {
  const result = validateExtractionResult({
    type: "idea",
    data: {
      title: "Simple idea",
      summary: null,
      links: [],
    },
  });
  assert(result.success === true, "Should succeed with empty links array");
});

test("validates valid person extraction", () => {
  const result = validateExtractionResult({
    type: "person",
    data: {
      name: "John Smith",
      relationshipContext: "Colleague from marketing",
      followUpNextAction: "Schedule lunch",
    },
  });
  assert(result.success === true, "Should succeed");
});

// =============================================================================
// Missing Required Fields Tests
// =============================================================================

test("rejects task with missing title", () => {
  const result = validateExtractionResult({
    type: "task",
    data: {
      title: "",
      nextAction: "Do something",
      dueDate: null,
      context: null,
    },
  });
  assert(result.success === false, "Should fail");
  if (!result.success) {
    assert(
      result.errors.some((e: { path: string }) => e.path.includes("title")),
      "Should have title error"
    );
  }
});

test("rejects task with missing nextAction", () => {
  const result = validateExtractionResult({
    type: "task",
    data: {
      title: "Valid title",
      nextAction: "",
      dueDate: null,
      context: null,
    },
  });
  assert(result.success === false, "Should fail");
  if (!result.success) {
    assert(
      result.errors.some((e: { path: string }) => e.path.includes("nextAction")),
      "Should have nextAction error"
    );
  }
});

test("rejects project with missing name", () => {
  const result = validateExtractionResult({
    type: "project",
    data: {
      name: "",
      desiredOutcome: "Some outcome",
      nextAction: null,
    },
  });
  assert(result.success === false, "Should fail");
  if (!result.success) {
    assert(
      result.errors.some((e: { path: string }) => e.path.includes("name")),
      "Should have name error"
    );
  }
});

test("rejects idea with missing title", () => {
  const result = validateExtractionResult({
    type: "idea",
    data: {
      title: "",
      summary: "Some summary",
      links: [],
    },
  });
  assert(result.success === false, "Should fail");
  if (!result.success) {
    assert(
      result.errors.some((e: { path: string }) => e.path.includes("title")),
      "Should have title error"
    );
  }
});

test("rejects person with missing name", () => {
  const result = validateExtractionResult({
    type: "person",
    data: {
      name: "",
      relationshipContext: "Some context",
      followUpNextAction: null,
    },
  });
  assert(result.success === false, "Should fail");
  if (!result.success) {
    assert(
      result.errors.some((e: { path: string }) => e.path.includes("name")),
      "Should have name error"
    );
  }
});

// =============================================================================
// Malformed Structure Tests
// =============================================================================

test("rejects completely malformed response (no type)", () => {
  const result = validateExtractionResult({
    foo: "bar",
    data: { title: "Test" },
  });
  assert(result.success === false, "Should fail for missing type");
});

test("rejects response with invalid type", () => {
  const result = validateExtractionResult({
    type: "invalid_type",
    data: { title: "Test" },
  });
  assert(result.success === false, "Should fail for invalid type");
});

test("rejects response with missing data field", () => {
  const result = validateExtractionResult({
    type: "task",
  });
  assert(result.success === false, "Should fail for missing data");
});

test("rejects response with wrong data structure for type", () => {
  // Task type but project-like data
  const result = validateExtractionResult({
    type: "task",
    data: {
      name: "Project name", // Wrong field for task
      desiredOutcome: "Some outcome",
    },
  });
  assert(result.success === false, "Should fail for wrong data structure");
});

test("rejects null input", () => {
  const result = validateExtractionResult(null);
  assert(result.success === false, "Should fail for null");
});

test("rejects undefined input", () => {
  const result = validateExtractionResult(undefined);
  assert(result.success === false, "Should fail for undefined");
});

test("rejects string input", () => {
  const result = validateExtractionResult("not an object");
  assert(result.success === false, "Should fail for string");
});

test("rejects array input", () => {
  const result = validateExtractionResult([{ type: "task" }]);
  assert(result.success === false, "Should fail for array");
});

// =============================================================================
// Wrong Type Tests (type coercion issues)
// =============================================================================

test("rejects task with number title", () => {
  const result = validateExtractionResult({
    type: "task",
    data: {
      title: 12345,
      nextAction: "Do something",
      dueDate: null,
      context: null,
    },
  });
  assert(result.success === false, "Should fail for number title");
});

test("rejects idea with object instead of links array", () => {
  const result = validateExtractionResult({
    type: "idea",
    data: {
      title: "Idea",
      summary: null,
      links: { url: "https://example.com" },
    },
  });
  assert(result.success === false, "Should fail for object links");
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
