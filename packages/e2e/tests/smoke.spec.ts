import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("homepage redirects to capture", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/capture/);
  });

  test("main navigation routes are accessible", async ({ page }) => {
    const routes = [
      { path: "/capture", title: /capture/i },
      { path: "/inbox", title: /inbox/i },
      { path: "/today", title: /today/i },
      { path: "/browse", title: /browse/i },
      { path: "/search", title: /search/i },
    ];

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page).toHaveURL(route.path);
    }
  });

  test("app loads without JavaScript errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto("/capture");
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
});
