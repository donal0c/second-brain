/**
 * Smoke Tests - Basic application health checks
 *
 * These tests verify that the core pages load correctly and
 * basic navigation works. Run these first to catch major issues.
 */

import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage redirects to capture page", async ({ page }) => {
    await page.goto("/");

    // Should redirect to /capture
    await expect(page).toHaveURL(/\/capture/);
  });

  test("capture page loads", async ({ page }) => {
    await page.goto("/capture");

    // Page should have a capture input
    await expect(
      page.getByRole("textbox").or(page.locator("textarea")).first()
    ).toBeVisible();
  });

  test("inbox page loads", async ({ page }) => {
    await page.goto("/inbox");

    // Page should load without errors
    await expect(page.locator("body")).not.toContainText("error", {
      ignoreCase: true,
    });
  });

  test("today page loads", async ({ page }) => {
    await page.goto("/today");

    // Page should load without errors
    await expect(page.locator("body")).not.toContainText("error", {
      ignoreCase: true,
    });
  });

  test("browse page loads", async ({ page }) => {
    await page.goto("/browse");

    // Page should load without errors
    await expect(page.locator("body")).not.toContainText("error", {
      ignoreCase: true,
    });
  });

  test("search page loads", async ({ page }) => {
    await page.goto("/search");

    // Should have the search page input (not the global header search)
    await expect(
      page.getByRole("textbox", { name: "Search tasks, projects, ideas" })
    ).toBeVisible();
  });

  test("navigation between pages works", async ({ page }) => {
    await page.goto("/capture");

    // Find and click navigation links
    // This depends on the actual navigation structure
    const navLinks = page.locator("nav a, nav button");

    if ((await navLinks.count()) > 0) {
      // Click each nav link and verify page changes
      const linkCount = await navLinks.count();
      for (let i = 0; i < Math.min(linkCount, 3); i++) {
        const link = navLinks.nth(i);
        const href = await link.getAttribute("href");

        if (href && href !== "#") {
          await link.click();
          await page.waitForLoadState("networkidle");

          // Verify we navigated somewhere
          expect(page.url()).not.toBe("about:blank");
        }
      }
    }
  });
});

test.describe("API Health Checks", () => {
  test("health endpoint returns 200", async ({ request }) => {
    const response = await request.get("http://localhost:3001/health");
    expect(response.status()).toBe(200);
  });

  test("inbox endpoint is accessible", async ({ request }) => {
    const response = await request.get("http://localhost:3001/inbox");
    // Should return 200 or appropriate status
    expect([200, 401, 403]).toContain(response.status());
  });
});
