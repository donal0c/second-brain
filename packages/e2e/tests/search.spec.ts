import { test, expect } from "@playwright/test";

test.describe("Search Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/search");
  });

  test("search page renders", async ({ page }) => {
    // Verify the page loads with search form
    await expect(page.getByRole("heading", { name: "Search" })).toBeVisible();
    await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /search/i })).toBeVisible();
  });

  test("search input accepts queries", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);

    // Type a search query
    await searchInput.fill("test query");
    await expect(searchInput).toHaveValue("test query");

    // Verify the input value updates
    await searchInput.clear();
    await searchInput.fill("another query");
    await expect(searchInput).toHaveValue("another query");
  });

  test("results display correctly", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const searchButton = page.getByRole("button", { name: /search/i });

    // Enter a search query that should return results
    await searchInput.fill("test");
    await searchButton.click();

    // Wait for search to complete (loading state should disappear)
    await expect(page.getByText(/searching/i)).not.toBeVisible({
      timeout: 10000,
    });

    // Check if results are displayed or empty state is shown
    const resultsText = page.getByText(/found \d+ result/i);
    const noResultsText = page.getByText(/no results found/i);

    // Either we have results or no results message
    const hasResults = await resultsText.isVisible().catch(() => false);
    const hasNoResults = await noResultsText.isVisible().catch(() => false);

    expect(hasResults || hasNoResults).toBe(true);
  });

  test("result links navigate to entity", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const searchButton = page.getByRole("button", { name: /search/i });

    // Enter a search query
    await searchInput.fill("test");
    await searchButton.click();

    // Wait for loading to complete
    await expect(page.getByText(/searching/i)).not.toBeVisible({
      timeout: 10000,
    });

    // Check if there are results
    const resultsCount = await page
      .locator('[class*="cursor-pointer"]')
      .count();

    if (resultsCount > 0) {
      // Click on the first result
      const firstResult = page.locator('[class*="cursor-pointer"]').first();
      await firstResult.click();

      // Should navigate to browse page with the entity
      await expect(page).toHaveURL(/\/browse\?type=.*&id=/);
    } else {
      // If no results, skip this part (test still passes)
      test.info().annotations.push({
        type: "skip",
        description: "No search results to click",
      });
    }
  });

  test("empty state for no results", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const searchButton = page.getByRole("button", { name: /search/i });

    // Enter a search query that should return no results
    await searchInput.fill("xyznonexistent12345abcdef");
    await searchButton.click();

    // Wait for loading to complete
    await expect(page.getByText(/searching/i)).not.toBeVisible({
      timeout: 10000,
    });

    // Check for empty state message
    await expect(page.getByText(/no results found/i)).toBeVisible();
    await expect(page.getByText(/try adjusting your search/i)).toBeVisible();
  });

  test("special characters don't crash", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const searchButton = page.getByRole("button", { name: /search/i });

    // Test various special characters that could cause regex/SQL issues
    const specialQueries = [
      "(test)",
      "[test]",
      "test*",
      "test?",
      "test+",
      "test.test",
      "test^",
      "test$",
      "test|test",
      "test\\test",
      "test{1}",
      "'; DROP TABLE users; --",
      "<script>alert('xss')</script>",
    ];

    for (const query of specialQueries) {
      // Clear and enter new query
      await searchInput.clear();
      await searchInput.fill(query);
      await searchButton.click();

      // Wait for loading to complete - page should not crash
      await expect(page.getByText(/searching/i)).not.toBeVisible({
        timeout: 10000,
      });

      // Page should still be functional (either results or empty state)
      const isStillFunctional =
        (await page
          .getByText(/found \d+ result/i)
          .isVisible()
          .catch(() => false)) ||
        (await page
          .getByText(/no results found/i)
          .isVisible()
          .catch(() => false));

      expect(isStillFunctional).toBe(true);
    }
  });

  test("type filter works", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const typeFilter = page.locator("select").first();
    const searchButton = page.getByRole("button", { name: /search/i });

    // Search with type filter
    await searchInput.fill("test");
    await typeFilter.selectOption("task");
    await searchButton.click();

    // Wait for search to complete
    await expect(page.getByText(/searching/i)).not.toBeVisible({
      timeout: 10000,
    });

    // Verify filter is applied
    await expect(typeFilter).toHaveValue("task");
  });

  test("clear filters button works", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    const typeFilter = page.locator("select").first();

    // Set up filters
    await searchInput.fill("test");
    await typeFilter.selectOption("task");

    // Wait for clear button to appear
    const clearButton = page.getByRole("button", { name: /clear filters/i });
    await expect(clearButton).toBeVisible();

    // Click clear filters
    await clearButton.click();

    // Verify filters are cleared
    await expect(typeFilter).toHaveValue("");
  });

  test("initial state shows prompt", async ({ page }) => {
    // On initial load without query, should show prompt
    await expect(
      page.getByText(/enter a search query to find/i)
    ).toBeVisible();
  });

  test("debounced search triggers automatically", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);

    // Type a query without clicking search
    await searchInput.fill("test");

    // Wait for debounce (300ms + search time)
    await page.waitForTimeout(500);

    // Search should trigger automatically
    // Either shows results or "no results"
    const searchTriggered =
      (await page
        .getByText(/found \d+ result/i)
        .isVisible()
        .catch(() => false)) ||
      (await page
        .getByText(/no results found/i)
        .isVisible()
        .catch(() => false));

    expect(searchTriggered).toBe(true);
  });
});
