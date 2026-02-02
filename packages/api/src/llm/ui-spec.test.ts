// =============================================================================
// UISpec Schema Tests
// =============================================================================
// Run with: npx tsx packages/api/src/llm/ui-spec.test.ts

import { UISpecSchema } from "./ui-spec.js";
import { getToolsForContext } from "./tools/index.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  return { name, fn };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const tests = [
  test("UISpecSchema accepts minimal spec", () => {
    const result = UISpecSchema.parse({
      layout: "minimal",
      sections: [
        {
          id: "alert-1",
          type: "alert",
          data: { content: "All clear." },
        },
      ],
    });
    assert(result.layout === "minimal", "Should preserve layout");
    assert(result.sections.length === 1, "Should keep section list");
  }),
  test("UISpecSchema rejects empty sections", () => {
    let threw = false;
    try {
      UISpecSchema.parse({ layout: "minimal", sections: [] });
    } catch {
      threw = true;
    }
    assert(threw, "Should reject empty sections");
  }),
  test("UI spec tools are registered", () => {
    const digestTools = getToolsForContext("digest-spec");
    const browseTools = getToolsForContext("browse-spec");
    const clarificationTools = getToolsForContext("clarification-spec");

    assert("digestUiSpec" in digestTools, "digestUiSpec tool missing");
    assert("browseUiSpec" in browseTools, "browseUiSpec tool missing");
    assert("clarificationUiSpec" in clarificationTools, "clarificationUiSpec tool missing");
  }),
];

for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${name}`);
    console.error(err);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
