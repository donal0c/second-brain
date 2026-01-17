import { test, expect } from "@playwright/test";

test.describe("Receipts Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/receipts");
  });

  test("receipts page loads successfully", async ({ page }) => {
    await expect(page).toHaveURL("/receipts");
  });

  test("receipts page renders without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.waitForLoadState("networkidle");
    expect(errors).toHaveLength(0);
  });

  test("receipts content area is visible", async ({ page }) => {
    // Wait for main content to load
    await page.waitForLoadState("domcontentloaded");

    // Check that the main app structure is present
    const mainContent = page.locator('main, [role="main"], .main, #app');
    await expect(mainContent.first()).toBeVisible();
  });
});
