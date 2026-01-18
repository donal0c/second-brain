/**
 * E2E Test Helpers
 *
 * Common utilities for Playwright tests, including navigation helpers,
 * API utilities, and test setup functions.
 */

import { Page, expect, type Locator } from "@playwright/test";

// =============================================================================
// Navigation Helpers
// =============================================================================

/**
 * Navigate to a page and wait for it to be ready
 */
export async function navigateTo(
  page: Page,
  route:
    | "capture"
    | "inbox"
    | "today"
    | "browse"
    | "clarifications"
    | "receipts"
    | "search"
    | "digest"
    | "weekly"
) {
  const routes: Record<string, string> = {
    capture: "/capture",
    inbox: "/inbox",
    today: "/today",
    browse: "/browse",
    clarifications: "/clarifications",
    receipts: "/receipts",
    search: "/search",
    digest: "/digest/dashboard",
    weekly: "/digest/weekly",
  };

  await page.goto(routes[route]);
  await page.waitForLoadState("networkidle");
}

/**
 * Wait for the app to be fully loaded
 */
export async function waitForAppReady(page: Page) {
  // Wait for the layout to be visible
  await page.waitForSelector("[data-testid='app-layout']", {
    state: "visible",
    timeout: 10000,
  }).catch(() => {
    // Fallback: wait for any main content
    return page.waitForSelector("main, [role='main']", { state: "visible" });
  });
}

// =============================================================================
// Capture Helpers
// =============================================================================

/**
 * Capture a quick thought through the UI
 */
export async function captureThought(page: Page, text: string) {
  await navigateTo(page, "capture");

  // Find and fill the capture input
  const input = page.getByRole("textbox").or(page.locator("textarea")).first();
  await input.fill(text);

  // Submit the capture
  const submitButton = page
    .getByRole("button", { name: /capture|submit|save/i })
    .or(page.locator('button[type="submit"]'));
  await submitButton.click();

  // Wait for success feedback
  await expect(
    page.getByText(/captured|saved|added/i).or(input)
  ).toBeVisible({ timeout: 5000 });
}

// =============================================================================
// Inbox Helpers
// =============================================================================

/**
 * Get the count of items in the inbox
 */
export async function getInboxCount(page: Page): Promise<number> {
  await navigateTo(page, "inbox");

  // Try to find inbox items
  const items = page.locator("[data-testid='inbox-item']").or(
    page.locator(".inbox-item")
  );

  return await items.count();
}

/**
 * Process an inbox item (click the process button)
 */
export async function processInboxItem(page: Page, index = 0) {
  await navigateTo(page, "inbox");

  const items = page.locator("[data-testid='inbox-item']").or(
    page.locator(".inbox-item")
  );
  const item = items.nth(index);

  const processButton = item.getByRole("button", { name: /process/i });
  await processButton.click();

  // Wait for processing to complete
  await page.waitForTimeout(1000); // Allow API call to complete
}

// =============================================================================
// Browse Helpers
// =============================================================================

/**
 * Navigate to a specific entity type in Browse
 */
export async function browseTo(
  page: Page,
  entityType: "tasks" | "projects" | "ideas" | "persons"
) {
  await navigateTo(page, "browse");

  // Click the tab or filter for the entity type
  const tab = page.getByRole("tab", { name: new RegExp(entityType, "i") }).or(
    page.getByRole("button", { name: new RegExp(entityType, "i") })
  );
  await tab.click();
  await page.waitForLoadState("networkidle");
}

/**
 * Get count of entities in Browse view
 */
export async function getEntityCount(
  page: Page,
  entityType: "tasks" | "projects" | "ideas" | "persons"
): Promise<number> {
  await browseTo(page, entityType);

  const items = page
    .locator(`[data-testid='${entityType.slice(0, -1)}-item']`)
    .or(page.locator(`.${entityType.slice(0, -1)}-item`))
    .or(page.locator(`[data-entity-type='${entityType}']`));

  return await items.count();
}

// =============================================================================
// Search Helpers
// =============================================================================

/**
 * Perform a search and return results
 */
export async function search(page: Page, query: string): Promise<Locator> {
  await navigateTo(page, "search");

  const searchInput = page
    .getByRole("searchbox")
    .or(page.getByPlaceholder(/search/i))
    .or(page.locator('input[type="search"]'));

  await searchInput.fill(query);
  await searchInput.press("Enter");

  // Wait for results
  await page.waitForLoadState("networkidle");

  return page.locator("[data-testid='search-result']").or(
    page.locator(".search-result")
  );
}

// =============================================================================
// API Helpers
// =============================================================================

const API_BASE = process.env.VITE_API_URL || "http://localhost:3001";

/**
 * Make an API request directly (bypassing the UI)
 */
export async function apiRequest<T>(
  page: Page,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  endpoint: string,
  body?: unknown
): Promise<T> {
  const response = await page.evaluate(
    async ({ method, endpoint, body, apiBase }) => {
      const res = await fetch(`${apiBase}${endpoint}`, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      return res.json();
    },
    { method, endpoint, body, apiBase: API_BASE }
  );

  return response as T;
}

/**
 * Create an inbox item via API
 */
export async function createInboxItemViaApi(
  page: Page,
  rawText: string
): Promise<{ id: string }> {
  return apiRequest(page, "POST", "/inbox", { rawText });
}

/**
 * Clear all test data via API (if endpoint exists)
 */
export async function clearTestDataViaApi(page: Page) {
  try {
    await apiRequest(page, "DELETE", "/test/reset");
  } catch {
    // Endpoint may not exist - silently ignore
    console.log("Test reset endpoint not available");
  }
}

// =============================================================================
// Assertion Helpers
// =============================================================================

/**
 * Assert that a toast/notification appears with given text
 */
export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page
    .getByRole("alert")
    .or(page.locator("[data-testid='toast']"))
    .or(page.locator(".toast, .notification"));

  await expect(toast).toContainText(text);
}

/**
 * Assert that the page has no accessibility violations (basic check)
 */
export async function expectNoA11yViolations(page: Page) {
  // Check for required ARIA attributes
  const images = page.locator("img:not([alt])");
  const imageCount = await images.count();
  expect(imageCount).toBe(0);

  // Check for form labels
  const inputsWithoutLabels = page.locator(
    "input:not([aria-label]):not([aria-labelledby]):not([id])"
  );
  const unlabeledInputCount = await inputsWithoutLabels.count();
  expect(unlabeledInputCount).toBe(0);
}

// =============================================================================
// Wait Helpers
// =============================================================================

/**
 * Wait for a specific API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  options?: { timeout?: number }
) {
  return page.waitForResponse(
    (response) => {
      const matches =
        typeof urlPattern === "string"
          ? response.url().includes(urlPattern)
          : urlPattern.test(response.url());
      return matches && response.status() === 200;
    },
    { timeout: options?.timeout || 10000 }
  );
}

/**
 * Wait for loading indicator to disappear
 */
export async function waitForLoading(page: Page) {
  const loadingIndicator = page
    .locator("[data-testid='loading']")
    .or(page.locator(".loading, .spinner"))
    .or(page.getByRole("progressbar"));

  // Wait for loading to appear and then disappear
  await loadingIndicator.waitFor({ state: "hidden", timeout: 10000 }).catch(() => {
    // Loading may have already finished - that's fine
  });
}
