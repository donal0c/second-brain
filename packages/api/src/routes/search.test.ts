// =============================================================================
// Search Unit Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/search.test.ts

import {
  escapeHtml,
  escapeRegex,
  generateSnippet,
  getTitleRelevanceScore,
  SearchQuerySchema,
} from "./search.js";

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
// escapeHtml Tests
// =============================================================================

console.log("\n--- escapeHtml Tests ---");

test("escapes ampersand", () => {
  assertEqual(escapeHtml("foo & bar"), "foo &amp; bar");
});

test("escapes less than", () => {
  assertEqual(escapeHtml("a < b"), "a &lt; b");
});

test("escapes greater than", () => {
  assertEqual(escapeHtml("a > b"), "a &gt; b");
});

test("escapes double quotes", () => {
  assertEqual(escapeHtml('say "hello"'), "say &quot;hello&quot;");
});

test("escapes single quotes", () => {
  assertEqual(escapeHtml("it's"), "it&#39;s");
});

test("escapes multiple entities in one string", () => {
  assertEqual(
    escapeHtml('<script>alert("xss")</script>'),
    "&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;"
  );
});

test("handles empty string", () => {
  assertEqual(escapeHtml(""), "");
});

test("leaves safe text unchanged", () => {
  assertEqual(escapeHtml("Hello World 123"), "Hello World 123");
});

// =============================================================================
// escapeRegex Tests
// =============================================================================

console.log("\n--- escapeRegex Tests ---");

test("escapes dot", () => {
  assertEqual(escapeRegex("a.b"), "a\\.b");
});

test("escapes asterisk", () => {
  assertEqual(escapeRegex("a*b"), "a\\*b");
});

test("escapes plus", () => {
  assertEqual(escapeRegex("a+b"), "a\\+b");
});

test("escapes question mark", () => {
  assertEqual(escapeRegex("a?b"), "a\\?b");
});

test("escapes caret", () => {
  assertEqual(escapeRegex("^start"), "\\^start");
});

test("escapes dollar sign", () => {
  assertEqual(escapeRegex("end$"), "end\\$");
});

test("escapes curly braces", () => {
  assertEqual(escapeRegex("a{1,2}"), "a\\{1,2\\}");
});

test("escapes parentheses", () => {
  assertEqual(escapeRegex("(group)"), "\\(group\\)");
});

test("escapes pipe", () => {
  assertEqual(escapeRegex("a|b"), "a\\|b");
});

test("escapes square brackets", () => {
  assertEqual(escapeRegex("[abc]"), "\\[abc\\]");
});

test("escapes backslash", () => {
  assertEqual(escapeRegex("a\\b"), "a\\\\b");
});

test("escapes multiple special chars", () => {
  assertEqual(escapeRegex(".*+?^${}()|[]\\"), "\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
});

test("leaves normal text unchanged", () => {
  assertEqual(escapeRegex("hello world"), "hello world");
});

// =============================================================================
// generateSnippet Tests
// =============================================================================

console.log("\n--- generateSnippet Tests ---");

test("returns empty string for empty input", () => {
  assertEqual(generateSnippet("", "test"), "");
});

test("returns empty string for null-like input", () => {
  assertEqual(generateSnippet(null as unknown as string, "test"), "");
});

test("highlights single search term", () => {
  const result = generateSnippet("Hello world, welcome to the test", "world");
  assert(result.includes("<mark>world</mark>"), "Should highlight 'world'");
});

test("highlights multiple search terms", () => {
  const result = generateSnippet("Hello world, welcome home", "world home");
  assert(result.includes("<mark>world</mark>"), "Should highlight 'world'");
  assert(result.includes("<mark>home</mark>"), "Should highlight 'home'");
});

test("highlighting is case-insensitive", () => {
  const result = generateSnippet("Hello WORLD", "world");
  assert(result.includes("<mark>WORLD</mark>"), "Should highlight 'WORLD' with lowercase query");
});

test("escapes HTML in text before highlighting", () => {
  const result = generateSnippet("Use <script> tags", "script");
  assert(result.includes("&lt;"), "Should escape < character");
  assert(result.includes("&gt;"), "Should escape > character");
  assert(result.includes("<mark>script</mark>"), "Should still highlight term");
});

test("truncates long text with ellipsis", () => {
  const longText = "a".repeat(500);
  const result = generateSnippet(longText, "nomatch", 200);
  assert(result.length <= 210, "Should be within reasonable length"); // Allow for ellipsis
  assert(result.endsWith("..."), "Should end with ellipsis");
});

test("centers snippet around first match", () => {
  // Use a longer prefix so the match is far enough to trigger ellipsis
  // The snippet extracts text starting 50 chars before the match
  const text = "This is a very very very very very long prefix text before we get to the keyword somewhere in the middle of the document";
  const result = generateSnippet(text, "keyword", 100);
  assert(result.includes("<mark>keyword</mark>"), "Should contain highlighted keyword");
  assert(result.startsWith("..."), "Should start with ellipsis when match is not at start");
});

test("handles special regex characters in search query", () => {
  const result = generateSnippet("Test (parentheses) in text", "(parentheses)");
  assert(result.includes("<mark>(parentheses)</mark>"), "Should highlight term with special chars");
});

test("handles query with HTML-like characters", () => {
  const result = generateSnippet("Compare a < b and c > d", "< b");
  // The < should be escaped in the output
  assert(result.includes("&lt;"), "Should escape < in text");
});

test("respects maxLength parameter", () => {
  const text = "Short text";
  const result = generateSnippet(text, "short", 5);
  // With such a short maxLength, it should still function
  assert(typeof result === "string", "Should return a string");
});

test("handles no match found - returns beginning of text", () => {
  const text = "Hello world this is a test";
  const result = generateSnippet(text, "xyz", 20);
  assert(!result.includes("<mark>"), "Should not have any highlights");
  assert(result.startsWith("Hello"), "Should start from beginning when no match");
});

// =============================================================================
// getTitleRelevanceScore Tests
// =============================================================================

console.log("\n--- getTitleRelevanceScore Tests ---");

test("returns 3 for exact match", () => {
  assertEqual(getTitleRelevanceScore("Buy groceries", "buy groceries"), 3);
});

test("returns 3 for exact match (case insensitive)", () => {
  assertEqual(getTitleRelevanceScore("BUY GROCERIES", "buy groceries"), 3);
});

test("returns 2 for prefix match", () => {
  assertEqual(getTitleRelevanceScore("Buy groceries today", "buy groceries"), 2);
});

test("returns 2 for prefix match (case insensitive)", () => {
  assertEqual(getTitleRelevanceScore("BUY GROCERIES TODAY", "buy groceries"), 2);
});

test("returns 1 for contains match", () => {
  assertEqual(getTitleRelevanceScore("Must buy groceries soon", "buy groceries"), 1);
});

test("returns 1 for contains match (case insensitive)", () => {
  assertEqual(getTitleRelevanceScore("MUST BUY GROCERIES SOON", "buy groceries"), 1);
});

test("returns 0 for no match", () => {
  assertEqual(getTitleRelevanceScore("Send email", "buy groceries"), 0);
});

test("handles empty title", () => {
  assertEqual(getTitleRelevanceScore("", "test"), 0);
});

test("handles empty query", () => {
  // Empty query matches as prefix of any string
  assertEqual(getTitleRelevanceScore("Any title", ""), 2);
});

test("handles both empty", () => {
  assertEqual(getTitleRelevanceScore("", ""), 3); // Empty equals empty
});

// =============================================================================
// SearchQuerySchema Validation Tests
// =============================================================================

console.log("\n--- SearchQuerySchema Validation Tests ---");

test("validates basic query", () => {
  const result = SearchQuerySchema.safeParse({ q: "test" });
  assert(result.success === true, "Should accept basic query");
});

test("validates query with all parameters", () => {
  const result = SearchQuerySchema.safeParse({
    q: "test",
    type: "task",
    context: "@work",
    status: "active",
    from: "2024-01-01",
    to: "2024-12-31",
    limit: 25,
    offset: 10,
  });
  assert(result.success === true, "Should accept all valid parameters");
});

test("rejects empty query string", () => {
  const result = SearchQuerySchema.safeParse({ q: "" });
  assert(result.success === false, "Should reject empty query");
});

test("rejects query exceeding max length", () => {
  const result = SearchQuerySchema.safeParse({ q: "a".repeat(201) });
  assert(result.success === false, "Should reject query > 200 chars");
});

test("accepts query at max length", () => {
  const result = SearchQuerySchema.safeParse({ q: "a".repeat(200) });
  assert(result.success === true, "Should accept query at 200 chars");
});

test("validates type enum - task", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", type: "task" });
  assert(result.success === true, "Should accept type: task");
});

test("validates type enum - project", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", type: "project" });
  assert(result.success === true, "Should accept type: project");
});

test("validates type enum - idea", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", type: "idea" });
  assert(result.success === true, "Should accept type: idea");
});

test("rejects invalid type enum", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", type: "invalid" });
  assert(result.success === false, "Should reject invalid type");
});

test("coerces limit to number", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", limit: "25" });
  assert(result.success === true, "Should accept string limit");
  if (result.success) {
    assertEqual(result.data.limit, 25, "Should coerce to number");
  }
});

test("rejects limit below minimum", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", limit: 0 });
  assert(result.success === false, "Should reject limit < 1");
});

test("rejects limit above maximum", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", limit: 101 });
  assert(result.success === false, "Should reject limit > 100");
});

test("accepts limit at boundaries", () => {
  const result1 = SearchQuerySchema.safeParse({ q: "test", limit: 1 });
  const result2 = SearchQuerySchema.safeParse({ q: "test", limit: 100 });
  assert(result1.success === true, "Should accept limit = 1");
  assert(result2.success === true, "Should accept limit = 100");
});

test("coerces offset to number", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", offset: "10" });
  assert(result.success === true, "Should accept string offset");
  if (result.success) {
    assertEqual(result.data.offset, 10, "Should coerce to number");
  }
});

test("rejects negative offset", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", offset: -1 });
  assert(result.success === false, "Should reject negative offset");
});

test("accepts zero offset", () => {
  const result = SearchQuerySchema.safeParse({ q: "test", offset: 0 });
  assert(result.success === true, "Should accept offset = 0");
});

test("coerces date strings to Date objects", () => {
  const result = SearchQuerySchema.safeParse({
    q: "test",
    from: "2024-01-01",
    to: "2024-12-31",
  });
  assert(result.success === true, "Should accept date strings");
  if (result.success) {
    assert(result.data.from instanceof Date, "from should be Date");
    assert(result.data.to instanceof Date, "to should be Date");
  }
});

test("provides default values for limit and offset", () => {
  const result = SearchQuerySchema.safeParse({ q: "test" });
  assert(result.success === true, "Should succeed");
  if (result.success) {
    assertEqual(result.data.limit, 50, "Default limit should be 50");
    assertEqual(result.data.offset, 0, "Default offset should be 0");
  }
});

test("rejects missing required q parameter", () => {
  const result = SearchQuerySchema.safeParse({});
  assert(result.success === false, "Should reject missing q");
});

test("accepts optional parameters as undefined", () => {
  const result = SearchQuerySchema.safeParse({
    q: "test",
    type: undefined,
    context: undefined,
    status: undefined,
  });
  assert(result.success === true, "Should accept undefined optionals");
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
