import { test, expect } from "@playwright/test";

test.describe("Smoke Tests", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Second Brain/);
  });

  test("navigation works", async ({ page }) => {
    await page.goto("/");

    // Navigate to Capture
    await page.getByRole("link", { name: "Capture" }).click();
    await expect(page).toHaveURL(/\/capture/);

    // Navigate to Inbox
    await page.getByRole("link", { name: "Inbox" }).click();
    await expect(page).toHaveURL(/\/inbox/);

    // Navigate to Today
    await page.getByRole("link", { name: "Today" }).click();
    await expect(page).toHaveURL(/\/today/);

    // Navigate to Browse
    await page.getByRole("link", { name: "Browse" }).click();
    await expect(page).toHaveURL(/\/browse/);
  });

  test("capture page works", async ({ page }) => {
    await page.goto("/capture");
    await expect(page.getByRole("heading", { name: /Capture/i })).toBeVisible();
  });

  test("inbox page works", async ({ page }) => {
    await page.goto("/inbox");
    await expect(page.getByRole("heading", { name: /Inbox/i })).toBeVisible();
  });

  test("today page works", async ({ page }) => {
    await page.goto("/today");
    await expect(page.getByRole("heading", { name: /Today/i })).toBeVisible();
  });

  test("browse page works", async ({ page }) => {
    await page.goto("/browse");
    await expect(page.getByRole("heading", { name: /Browse/i })).toBeVisible();
  });

  test("search page works", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
  });

  // Line 54 - Fixed: Use specific selector for global search input
  test("global search navigates to search page", async ({ page }) => {
    await page.goto("/");

    // Use specific selector for global search in header/sidebar
    // The global search has placeholder "Search anything..."
    const globalSearchInput = page.getByRole("textbox", {
      name: "Search anything...",
    });

    await globalSearchInput.fill("test query");
    await globalSearchInput.press("Enter");

    // Should navigate to search page with query param
    await expect(page).toHaveURL(/\/search\?q=test%20query/);
  });

  test("search page input works independently of global search", async ({
    page,
  }) => {
    await page.goto("/search");

    // Verify we can target the search page input specifically
    // The search page input has placeholder "Search tasks, projects, ideas..."
    const searchPageInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    await expect(searchPageInput).toBeVisible();
    await searchPageInput.fill("my search");
    await expect(searchPageInput).toHaveValue("my search");
  });

  test("both search inputs exist on search page", async ({ page }) => {
    await page.goto("/search");

    // Global search in sidebar
    const globalSearch = page.getByRole("textbox", {
      name: "Search anything...",
    });

    // Search page input
    const pageSearch = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    // Both should be visible and distinct
    await expect(globalSearch).toBeVisible();
    await expect(pageSearch).toBeVisible();

    // They should be different elements
    await globalSearch.fill("global");
    await pageSearch.fill("page");

    await expect(globalSearch).toHaveValue("global");
    await expect(pageSearch).toHaveValue("page");
  });
});
