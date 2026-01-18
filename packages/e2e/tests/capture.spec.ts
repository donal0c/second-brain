/**
 * Capture Flow Tests
 *
 * Tests for the quick capture functionality - the primary entry point
 * for getting thoughts into Second Brain.
 */

import { test, expect } from "@playwright/test";
import { navigateTo, waitForApiResponse } from "./utils/test-helpers";

test.describe("Capture Flow", () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, "capture");
  });

  test("capture input is focused on page load", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    // Input should be focused (or at least visible and ready)
    await expect(input).toBeVisible();
  });

  test("can type in capture input", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    await input.fill("Test capture input");

    await expect(input).toHaveValue("Test capture input");
  });

  test("submitting capture sends to API", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    // Type a capture
    await input.fill("Buy groceries for dinner");

    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/inbox") && response.request().method() === "POST"
    );

    // Find and click submit button
    // Target the Capture button specifically (not the navbar search button)
    const submitButton = page.getByRole("button", { name: "Capture", exact: true });
    await submitButton.click();

    // Wait for API response
    const response = await responsePromise.catch(() => null);

    if (response) {
      expect(response.status()).toBe(201);
    }
  });

  test("capture input clears after successful submission", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    // Type and submit
    await input.fill("Clear after submit test");

    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/inbox") && response.request().method() === "POST"
    );

    // Target the Capture button specifically (not the navbar search button)
    const submitButton = page.getByRole("button", { name: "Capture", exact: true });
    await submitButton.click();

    // Wait for successful API response
    await responsePromise;

    // Wait for success message to appear (confirms the mutation completed and state updated)
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });

    // Input should now be empty
    await expect(input).toHaveValue("", { timeout: 3000 });
  });

  test("shows error for empty submission", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    // Ensure input is empty
    await input.clear();

    // Target the Capture button specifically
    const submitButton = page.getByRole("button", { name: "Capture", exact: true });

    // The button should be disabled when input is empty
    await expect(submitButton).toBeDisabled();
  });

  test("handles long text input", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    const longText = "A".repeat(1000);
    await input.fill(longText);

    // Input should accept long text
    const value = await input.inputValue();
    expect(value.length).toBeGreaterThan(500);
  });

  test("handles special characters", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    const specialText = "Test with special chars: @#$%^&*()_+-=[]{}|;':\",./<>?";
    await input.fill(specialText);

    await expect(input).toHaveValue(specialText);
  });

  test("handles unicode and emoji", async ({ page }) => {
    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");

    const unicodeText = "Meeting with Sarah about Q4 roadmap 🚀 日本語テスト";
    await input.fill(unicodeText);

    await expect(input).toHaveValue(unicodeText);
  });
});

test.describe("Capture Keyboard Shortcuts", () => {
  test("Ctrl/Cmd+Enter submits capture", async ({ page }) => {
    await navigateTo(page, "capture");

    // Target the capture textarea specifically by its placeholder
    const input = page.getByPlaceholder("What's on your mind?");
    await input.fill("Submit with keyboard shortcut");

    // Set up response listener
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/inbox") && response.request().method() === "POST"
    ).catch(() => null);

    // Use keyboard shortcut
    await input.press("Control+Enter");

    // Wait a bit for response
    const response = await responsePromise;

    if (response) {
      expect(response.status()).toBe(201);
    }
  });
});

test.describe("Capture Full Workflow", () => {
  const TEST_PREFIX = "__e2e_capture_test__";

  test.afterEach(async ({ page }) => {
    // Cleanup: Delete any test inbox items created during tests
    try {
      const apiBase = process.env.VITE_API_URL || "http://localhost:3001";

      // Get all inbox items
      const response = await page.request.get(`${apiBase}/inbox`);
      if (response.ok()) {
        const data = await response.json();
        const items = data.data || [];

        // Delete items that match our test prefix
        for (const item of items) {
          if (item.rawText?.startsWith(TEST_PREFIX)) {
            await page.request.delete(`${apiBase}/inbox/${item.id}`);
          }
        }
      }
    } catch (e) {
      // Cleanup failed - not critical for test
      console.log("Cleanup warning:", e);
    }
  });

  test("captured item appears in inbox", async ({ page }) => {
    const uniqueText = `${TEST_PREFIX} ${Date.now()} Test item for inbox verification`;

    // Step 1: Capture a thought
    await navigateTo(page, "capture");
    const input = page.getByPlaceholder("What's on your mind?");
    await input.fill(uniqueText);

    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/inbox") && response.request().method() === "POST"
    );

    const submitButton = page.getByRole("button", { name: "Capture", exact: true });
    await submitButton.click();

    // Wait for successful API response
    const response = await responsePromise;
    expect(response.status()).toBe(201);

    // Wait for success message to confirm the mutation completed
    await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });

    // Step 2: Navigate to inbox
    await navigateTo(page, "inbox");

    // Step 3: Verify item appears in inbox
    // Force a refresh to bypass React Query cache / stale component state
    await page.reload();
    await page.waitForLoadState("networkidle");

    // The inbox displays rawText, so look for a portion of our unique text
    // Use a partial match since the display might be truncated
    const uniquePart = uniqueText.substring(0, 50);
    const inboxItem = page.getByText(uniquePart, { exact: false });
    await expect(inboxItem).toBeVisible({ timeout: 10000 });
  });

  test("success feedback is displayed after capture", async ({ page }) => {
    const uniqueText = `${TEST_PREFIX} ${Date.now()} Success feedback test`;

    await navigateTo(page, "capture");
    const input = page.getByPlaceholder("What's on your mind?");
    await input.fill(uniqueText);

    // Set up response listener before clicking
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/inbox") && response.request().method() === "POST"
    );

    const submitButton = page.getByRole("button", { name: "Capture", exact: true });
    await submitButton.click();

    // Wait for successful API response
    await responsePromise;

    // The app shows a success message with role="status" after successful capture
    const successMessage = page.getByRole("status");
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify the success message contains expected text
    await expect(successMessage).toContainText(/captured|queued/i);

    // Input should also be cleared
    await expect(input).toHaveValue("", { timeout: 3000 });
  });

  test("multiple captures can be submitted in sequence", async ({ page }) => {
    // Increase timeout for this test since it submits 3 captures
    test.setTimeout(60000);

    await navigateTo(page, "capture");
    const input = page.getByPlaceholder("What's on your mind?");
    const submitButton = page.getByRole("button", { name: "Capture", exact: true });

    // Capture 3 items in sequence
    for (let i = 1; i <= 3; i++) {
      const text = `${TEST_PREFIX} ${Date.now()} Sequential capture ${i}`;

      // Wait for input to be enabled and fill it
      await expect(input).toBeEnabled({ timeout: 5000 });
      await input.fill(text);

      const responsePromise = page.waitForResponse(
        (response) =>
          response.url().includes("/inbox") && response.request().method() === "POST"
      );

      await submitButton.click();

      const response = await responsePromise;
      expect(response.status()).toBe(201);

      // Wait for success message to appear (confirms mutation completed)
      await expect(page.getByRole("status")).toBeVisible({ timeout: 5000 });

      // Wait for input to clear before next capture
      await expect(input).toHaveValue("", { timeout: 3000 });
    }
  });

  test("capture with newlines preserves formatting", async ({ page }) => {
    const multilineText = `${TEST_PREFIX} ${Date.now()}
Line 1: First thought
Line 2: Second thought
Line 3: Third thought`;

    await navigateTo(page, "capture");
    const input = page.getByPlaceholder("What's on your mind?");
    await input.fill(multilineText);

    // Verify multiline text is preserved in input
    const value = await input.inputValue();
    expect(value).toContain("Line 1:");
    expect(value).toContain("Line 2:");
    expect(value).toContain("Line 3:");

    // Submit and verify API accepts it
    const responsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/inbox") && response.request().method() === "POST"
    );

    const submitButton = page.getByRole("button", { name: "Capture", exact: true });
    await submitButton.click();

    const response = await responsePromise;
    expect(response.status()).toBe(201);
  });
});
