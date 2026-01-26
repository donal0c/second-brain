/**
 * LLM Verification Runner
 *
 * Runs verification test suites and generates reports.
 *
 * Usage:
 *   npx tsx tests/verification/run-verification.ts [suite]
 *
 * Examples:
 *   npx tsx tests/verification/run-verification.ts          # Run all suites
 *   npx tsx tests/verification/run-verification.ts inbox    # Run inbox suite only
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";
import {
  VerificationReport,
  TestSuite,
  TestCase,
  createEmptyReport,
  finalizeSuite,
  finalizeReport,
} from "./report-schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Configuration
// =============================================================================

const SUITES = {
  inbox: {
    id: "inbox-processing",
    name: "Inbox Processing",
    promptFile: "prompts/inbox-processing.md",
    description: "Verify inbox item classification and field extraction",
  },
  context: {
    id: "context-learning",
    name: "Context Learning",
    promptFile: "prompts/context-learning.md",
    description: "Verify personal context extraction and application",
  },
  search: {
    id: "search-quality",
    name: "Search Quality",
    promptFile: "prompts/search-quality.md",
    description: "Verify search relevance and ranking",
  },
};

// =============================================================================
// LLM Client
// =============================================================================

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY environment variable is required for verification"
    );
  }
  return new Anthropic({ apiKey });
}

// =============================================================================
// Verification Logic
// =============================================================================

async function runSuiteVerification(
  client: Anthropic,
  suiteConfig: (typeof SUITES)[keyof typeof SUITES]
): Promise<TestSuite> {
  console.log(`\nRunning suite: ${suiteConfig.name}`);

  const promptPath = join(__dirname, suiteConfig.promptFile);
  const promptContent = readFileSync(promptPath, "utf-8");

  const startTime = Date.now();

  // Send verification prompt to LLM
  const response = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `${promptContent}\n\nPlease run through ALL test cases listed above and provide your verification results in the JSON format specified. Return a JSON array of results for each case.`,
      },
    ],
  });

  const duration = Date.now() - startTime;

  // Parse response
  const responseText =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response
  const jsonMatch = responseText.match(/\[[\s\S]*\]/);
  let results: any[] = [];

  if (jsonMatch) {
    try {
      results = JSON.parse(jsonMatch[0]);
    } catch {
      console.warn("Could not parse JSON from response, creating error case");
      results = [
        {
          case_id: "parse_error",
          overall_pass: false,
          notes: "Failed to parse verification response",
        },
      ];
    }
  }

  // Convert to TestCases
  const cases: TestCase[] = results.map((result, index) => ({
    id: result.case_id || `case_${index + 1}`,
    name: `Test Case ${result.case_id || index + 1}`,
    input: result.input || result.query || "",
    expected: result.expected_classification || result.expected_top_result,
    actual: result.actual_classification || result.actual_top_result,
    status: result.overall_pass ? "pass" : "fail",
    assertions: buildAssertions(result),
    duration_ms: Math.round(duration / results.length),
    notes: result.notes,
  }));

  return finalizeSuite({
    id: suiteConfig.id,
    name: suiteConfig.name,
    description: suiteConfig.description,
    cases,
  });
}

function buildAssertions(result: any) {
  const assertions = [];

  if ("classification_correct" in result) {
    assertions.push({
      name: "Classification Accuracy",
      passed: result.classification_correct,
      severity: "critical" as const,
    });
  }

  if ("fields_correct" in result) {
    assertions.push({
      name: "Field Extraction",
      passed: result.fields_correct,
      message: result.field_issues?.join(", "),
      severity: "major" as const,
    });
  }

  if ("confidence_appropriate" in result) {
    assertions.push({
      name: "Confidence Score",
      passed: result.confidence_appropriate,
      severity: "minor" as const,
    });
  }

  if ("relevance_correct" in result) {
    assertions.push({
      name: "Search Relevance",
      passed: result.relevance_correct,
      severity: "critical" as const,
    });
  }

  if ("recall_complete" in result) {
    assertions.push({
      name: "Search Recall",
      passed: result.recall_complete,
      message: result.missing_results?.join(", "),
      severity: "major" as const,
    });
  }

  if ("extraction_correct" in result) {
    assertions.push({
      name: "Entity Extraction",
      passed: result.extraction_correct,
      severity: "critical" as const,
    });
  }

  if ("context_applied_correctly" in result) {
    assertions.push({
      name: "Context Application",
      passed: result.context_applied_correctly,
      severity: "major" as const,
    });
  }

  // Default assertion if none found
  if (assertions.length === 0) {
    assertions.push({
      name: "Overall Pass",
      passed: result.overall_pass ?? false,
      severity: "critical" as const,
    });
  }

  return assertions;
}

// =============================================================================
// Report Generation
// =============================================================================

async function generateReport(suitesToRun?: string[]): Promise<VerificationReport> {
  const client = getAnthropicClient();

  // Get git info
  let gitCommit: string | undefined;
  let gitBranch: string | undefined;
  try {
    const { execSync } = await import("child_process");
    gitCommit = execSync("git rev-parse --short HEAD", {
      encoding: "utf-8",
    }).trim();
    gitBranch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf-8",
    }).trim();
  } catch {
    // Git info not available
  }

  const report = createEmptyReport({
    app_version: "0.1.0",
    git_commit: gitCommit,
    git_branch: gitBranch,
    environment: process.env.NODE_ENV || "development",
    llm_model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",
    triggered_by: "manual",
  });

  // Determine which suites to run
  const suiteKeys = suitesToRun?.length
    ? suitesToRun.filter((k) => k in SUITES)
    : Object.keys(SUITES);

  if (suiteKeys.length === 0) {
    console.error("No valid suites specified");
    process.exit(1);
  }

  // Run each suite
  for (const key of suiteKeys) {
    const suiteConfig = SUITES[key as keyof typeof SUITES];
    try {
      const suite = await runSuiteVerification(client, suiteConfig);
      report.suites.push(suite);
      console.log(
        `  ${suite.status === "pass" ? "✓" : "✗"} ${suite.name}: ${suite.metrics.passed}/${suite.metrics.total} passed`
      );
    } catch (error) {
      console.error(`  ✗ ${suiteConfig.name}: Error - ${error}`);
      report.suites.push(
        finalizeSuite({
          id: suiteConfig.id,
          name: suiteConfig.name,
          description: suiteConfig.description,
          cases: [
            {
              id: "error",
              name: "Suite Error",
              input: "",
              expected: null,
              status: "error",
              assertions: [
                {
                  name: "Suite Execution",
                  passed: false,
                  message: String(error),
                  severity: "critical",
                },
              ],
              notes: String(error),
            },
          ],
        })
      );
    }
  }

  // Add recommendations
  report.recommendations = [
    "Review failed test cases and update implementation",
    "Add edge cases for any identified gaps",
    "Consider adding regression tests for fixed issues",
  ];

  return finalizeReport(report);
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  const suitesToRun = args.length > 0 ? args : undefined;

  console.log("=".repeat(60));
  console.log("LLM Verification Runner");
  console.log("=".repeat(60));

  try {
    const report = await generateReport(suitesToRun);

    // Save report
    const reportsDir = join(__dirname, "reports");
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const reportPath = join(reportsDir, `verification-${timestamp}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));
    console.log(`Overall Status: ${report.summary.overall_status.toUpperCase()}`);
    console.log(
      `Pass Rate: ${report.summary.pass_rate.toFixed(1)}% (${report.summary.total_passed}/${report.summary.total_tests})`
    );
    console.log(`Duration: ${report.summary.total_duration_ms}ms`);
    console.log(`Report saved: ${reportPath}`);

    if (report.critical_issues.length > 0) {
      console.log("\nCritical Issues:");
      for (const issue of report.critical_issues) {
        console.log(`  [${issue.severity}] ${issue.source}: ${issue.description}`);
      }
    }

    // Exit with appropriate code
    process.exit(report.summary.overall_status === "pass" ? 0 : 1);
  } catch (error) {
    console.error("Verification failed:", error);
    process.exit(1);
  }
}

main().catch(console.error);
