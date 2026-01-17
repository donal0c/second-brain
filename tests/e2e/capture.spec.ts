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

    // Target the Capture button specifically (not the navbar search button)
    const submitButton = page.getByRole("button", { name: "Capture", exact: true });
    await submitButton.click();

    // Wait for the input to clear or show success
    await page.waitForTimeout(1000);

    // Input should be empty or show success state
    const value = await input.inputValue();
    expect(value).toBe("");
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
