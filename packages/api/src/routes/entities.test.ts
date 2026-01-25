// =============================================================================
// Entities Helper Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/entities.test.ts

import { hasEmbeddedFieldChange } from "./entities.js";

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

console.log("\n--- Entities Helper Tests ---\n");

test("task embedded fields detected", () => {
  assert(hasEmbeddedFieldChange("task", { title: "Test" }), "title should trigger");
  assert(hasEmbeddedFieldChange("task", { nextAction: "Do" }), "nextAction should trigger");
  assert(hasEmbeddedFieldChange("task", { context: "@work" }), "context should trigger");
});

test("project embedded fields detected", () => {
  assert(hasEmbeddedFieldChange("project", { name: "Project" }), "name should trigger");
  assert(hasEmbeddedFieldChange("project", { desiredOutcome: "Outcome" }), "desiredOutcome should trigger");
  assert(hasEmbeddedFieldChange("project", { nextAction: "Next" }), "nextAction should trigger");
});

test("idea embedded fields detected", () => {
  assert(hasEmbeddedFieldChange("idea", { title: "Idea" }), "title should trigger");
  assert(hasEmbeddedFieldChange("idea", { summary: "Summary" }), "summary should trigger");
});

test("person embedded fields detected", () => {
  assert(hasEmbeddedFieldChange("person", { name: "Name" }), "name should trigger");
  assert(hasEmbeddedFieldChange("person", { relationshipContext: "Context" }), "relationshipContext should trigger");
  assert(hasEmbeddedFieldChange("person", { followUpNextAction: "Follow" }), "followUpNextAction should trigger");
});

test("non-embedded fields do not trigger", () => {
  assert(!hasEmbeddedFieldChange("task", { status: "active" }), "status should not trigger");
  assert(!hasEmbeddedFieldChange("project", { needsReview: true }), "needsReview should not trigger");
  assert(!hasEmbeddedFieldChange("idea", { links: [] }), "links should not trigger");
  assert(!hasEmbeddedFieldChange("person", { lastTouchedAt: new Date() }), "lastTouchedAt should not trigger");
});

console.log("\n" + "=".repeat(50));
console.log(`Tests: ${passed} passed, ${failed} failed`);
console.log("=".repeat(50));

if (failed > 0) {
  process.exit(1);
}

process.exit(0);
