import { test, expect } from "@playwright/test";

test.describe("Capture Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/capture");
  });

  test("capture page loads successfully", async ({ page }) => {
    await expect(page).toHaveURL("/capture");
  });

  test("capture form elements are visible", async ({ page }) => {
    // Check for input area - typically a textarea or contenteditable
    const inputArea = page
      .locator('textarea, [contenteditable="true"], input[type="text"]')
      .first();
    await expect(inputArea).toBeVisible();
  });

  test("can type in capture input", async ({ page }) => {
    const inputArea = page
      .locator('textarea, [contenteditable="true"], input[type="text"]')
      .first();
    await inputArea.fill("Test capture note");
    await expect(inputArea).toHaveValue("Test capture note");
  });
});
