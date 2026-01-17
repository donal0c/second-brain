import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E Test Configuration for Second Brain Web
 *
 * Run with:
 *   pnpm exec playwright test                    # Run all tests
 *   pnpm exec playwright test --ui               # Run with UI mode
 *   pnpm exec playwright test --debug            # Run with debugger
 *   pnpm exec playwright test tests/e2e/inbox.spec.ts  # Run specific test
 */
export default defineConfig({
  // Test directory - relative to this config
  testDir: "../../tests/e2e",

  // Glob patterns for test files
  testMatch: "**/*.spec.ts",

  // Run tests in parallel within a file
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit parallel workers on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ["html", { outputFolder: "../../tests/e2e/reports" }],
    ["list"],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for relative navigation
    baseURL: "http://localhost:5173",

    // Collect trace on first retry
    trace: "on-first-retry",

    // Take screenshot on failure
    screenshot: "only-on-failure",

    // Record video on first retry
    video: "on-first-retry",
  },

  // Projects for different browsers
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    // Mobile viewports
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  // Web server configuration - starts both API and web servers
  webServer: [
    {
      // Start the API server
      command: "pnpm dev:api",
      cwd: "../..",
      url: "http://localhost:3001/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    {
      // Start the web dev server
      command: "pnpm dev:web",
      cwd: "../..",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],

  // Output directory for test artifacts
  outputDir: "../../tests/e2e/results",

  // Global timeout for each test
  timeout: 30000,

  // Timeout for expect() assertions
  expect: {
    timeout: 5000,
  },
});
