import { test, expect } from "@playwright/test";

test.describe("Search Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
  });

  test("search page renders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    // Use specific selector to target search page input (not global header search)
    await expect(
      page.getByRole("textbox", { name: "Search tasks, projects, ideas" })
    ).toBeVisible();
  });

  test("search input accepts queries", async ({ page }) => {
    // Target the search page input specifically by its placeholder text
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    await searchInput.fill("test query");
    await expect(searchInput).toHaveValue("test query");
  });

  test("results display correctly", async ({ page }) => {
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    await searchInput.fill("test");
    await page.getByRole("main").getByRole("button", { name: "Search" }).click();

    // Wait for results or empty state
    // Wait for either results count or empty state - use first() to handle multiple matches
    await expect(
      page.getByText(/Found \d+ results?|No results found/).first()
    ).toBeVisible({ timeout: 10000 });
  });

  test("result links navigate to entity", async ({ page }) => {
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    await searchInput.fill("test");
    await page.getByRole("main").getByRole("button", { name: "Search" }).click();

    // If there are results, clicking one should navigate to browse
    const results = page.locator("[data-testid='search-result']");
    const count = await results.count();

    if (count > 0) {
      await results.first().click();
      await expect(page).toHaveURL(/\/browse\?type=/);
    }
  });

  test("empty state for no results", async ({ page }) => {
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    // Search for something unlikely to exist
    await searchInput.fill("xyznonexistent12345");
    await page.getByRole("main").getByRole("button", { name: "Search" }).click();

    // Use first() since multiple elements may contain "No results found"
    await expect(page.getByText("No results found").first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("special characters don't crash", async ({ page }) => {
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    // Test various special characters
    await searchInput.fill("test <script>alert('xss')</script>");
    await page.getByRole("main").getByRole("button", { name: "Search" }).click();

    // Page should still be functional (not crashed)
    await expect(searchInput).toBeVisible();
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
  });

  test("type filter works", async ({ page }) => {
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    await searchInput.fill("test");

    // Select type filter
    const typeFilter = page.getByRole("combobox").first();
    await typeFilter.selectOption("task");

    // Verify filter is applied
    await expect(typeFilter).toHaveValue("task");
  });

  test("clear filters button works", async ({ page }) => {
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    await searchInput.fill("test");

    // Apply a filter first
    const typeFilter = page.getByRole("combobox").first();
    await typeFilter.selectOption("task");

    // Clear filters button should appear
    const clearButton = page.getByRole("button", { name: "Clear filters" });
    await expect(clearButton).toBeVisible();

    await clearButton.click();

    // Filter should be reset
    await expect(typeFilter).toHaveValue("");
  });

  test("debounced search triggers automatically", async ({ page }) => {
    const searchInput = page.getByRole("textbox", {
      name: "Search tasks, projects, ideas",
    });

    // Type slowly to trigger debounced search
    await searchInput.fill("test");

    // Wait for debounced search to trigger (300ms + API time)
    // Use first() since multiple elements may match
    await expect(
      page.getByText(/Found \d+ results?|No results found/).first()
    ).toBeVisible({ timeout: 5000 });
  });
});
