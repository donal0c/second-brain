import { test, expect } from "@playwright/test";

test.describe("Digest Page", () => {
  test("digest dashboard loads successfully", async ({ page }) => {
    await page.goto("/digest/dashboard");
    await expect(page).toHaveURL("/digest/dashboard");
  });

  test("weekly review page loads successfully", async ({ page }) => {
    await page.goto("/digest/weekly");
    await expect(page).toHaveURL("/digest/weekly");
  });

  test("digest pages render without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/digest/dashboard");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
