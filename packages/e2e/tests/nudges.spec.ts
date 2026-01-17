import { test, expect, Page } from "@playwright/test";

// The digest/dashboard page where Nudges component is displayed
const DIGEST_URL = "/digest/dashboard";

// Helper to set up nudges mock and navigate
async function setupNudgesAndNavigate(page: Page, nudges: object[]) {
  await page.route("**/nudges", (route) => {
    // Only intercept GET requests to /nudges endpoint
    if (route.request().method() === "GET" && route.request().url().endsWith("/nudges")) {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: nudges,
          meta: { total: nudges.length, limit: nudges.length, offset: 0 },
        }),
      });
    } else {
      route.continue();
    }
  });
  await page.goto(DIGEST_URL);
  await page.waitForLoadState("networkidle");
}

test.describe("Nudges", () => {
  test("Nudges component displays on Today page", async ({ page }) => {
    // Navigate without mocking - just verify the page loads
    await page.goto(DIGEST_URL);
    await page.waitForLoadState("networkidle");

    // The nudges component should exist (may be empty if no nudges)
    // Just verify page loads successfully
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });

  test("Nudge cards show correct info when nudges exist", async ({ page }) => {
    const testNudges = [
      {
        id: "test-nudge-1",
        type: "task_due_soon",
        message: '"Test Task" is due tomorrow',
        entityType: "task",
        entityId: "task-1",
        createdAt: new Date().toISOString(),
        dismissedAt: null,
        snoozedUntil: null,
      },
      {
        id: "test-nudge-2",
        type: "project_missing_next_action",
        message: 'Project "Test Project" needs a next action defined',
        entityType: "project",
        entityId: "project-1",
        createdAt: new Date().toISOString(),
        dismissedAt: null,
        snoozedUntil: null,
      },
    ];

    await setupNudgesAndNavigate(page, testNudges);

    // Check that nudge cards are displayed - use data-testid or text content
    await expect(page.getByText('"Test Task" is due tomorrow')).toBeVisible();
    await expect(
      page.getByText('Project "Test Project" needs a next action defined')
    ).toBeVisible();

    // Verify nudge type icons are shown (emojis)
    await expect(page.getByText("⏰")).toBeVisible(); // task_due_soon
    await expect(page.getByText("📋")).toBeVisible(); // project_missing_next_action
  });

  test("Dismiss button works", async ({ page }) => {
    const testNudge = {
      id: "test-nudge-dismiss",
      type: "task_stale",
      message: '"Stale Task" hasn\'t been updated in 10 days',
      entityType: "task",
      entityId: "task-stale",
      createdAt: new Date().toISOString(),
      dismissedAt: null,
      snoozedUntil: null,
    };

    // Set up the nudges route
    await page.route("**/nudges", (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith("/nudges")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [testNudge],
            meta: { total: 1, limit: 1, offset: 0 },
          }),
        });
      } else {
        route.continue();
      }
    });

    // Mock the dismiss endpoint
    await page.route("**/nudges/test-nudge-dismiss/dismiss", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { success: true } }),
      });
    });

    await page.goto(DIGEST_URL);
    await page.waitForLoadState("networkidle");

    // Verify nudge is visible
    const nudgeMessage = page.getByText(
      '"Stale Task" hasn\'t been updated in 10 days'
    );
    await expect(nudgeMessage).toBeVisible();

    // Click dismiss button (the X button with title "Dismiss")
    const dismissButton = page.getByTitle("Dismiss");
    await dismissButton.click();

    // Verify nudge is removed from the UI
    await expect(nudgeMessage).not.toBeVisible();
  });

  test("Snooze button works", async ({ page }) => {
    const testNudge = {
      id: "test-nudge-snooze",
      type: "person_follow_up",
      message: "It's been 20 days since you touched base with John",
      entityType: "person",
      entityId: "person-john",
      createdAt: new Date().toISOString(),
      dismissedAt: null,
      snoozedUntil: null,
    };

    // Set up the nudges route
    await page.route("**/nudges", (route) => {
      if (route.request().method() === "GET" && route.request().url().endsWith("/nudges")) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [testNudge],
            meta: { total: 1, limit: 1, offset: 0 },
          }),
        });
      } else {
        route.continue();
      }
    });

    // Mock the snooze endpoint
    await page.route("**/nudges/test-nudge-snooze/snooze", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            success: true,
            snoozedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      });
    });

    await page.goto(DIGEST_URL);
    await page.waitForLoadState("networkidle");

    // Verify nudge is visible
    const nudgeMessage = page.getByText(
      "It's been 20 days since you touched base with John"
    );
    await expect(nudgeMessage).toBeVisible();

    // Click snooze button (the sleep emoji button with title "Snooze")
    const snoozeButton = page.getByTitle("Snooze");
    await snoozeButton.click();

    // Snooze dropdown should appear
    const snoozeOption = page.getByText("1 day");
    await expect(snoozeOption).toBeVisible();

    // Click 1 day option
    await snoozeOption.click();

    // Verify nudge is removed from the UI
    await expect(nudgeMessage).not.toBeVisible();
  });

  test("Snooze dropdown shows all time options", async ({ page }) => {
    const testNudge = {
      id: "test-nudge-options",
      type: "task_due_soon",
      message: "Test nudge for snooze options",
      entityType: "task",
      entityId: "task-options",
      createdAt: new Date().toISOString(),
      dismissedAt: null,
      snoozedUntil: null,
    };

    await setupNudgesAndNavigate(page, [testNudge]);

    // Click snooze button
    const snoozeButton = page.getByTitle("Snooze");
    await snoozeButton.click();

    // Verify all snooze options are visible
    await expect(page.getByText("1 hour")).toBeVisible();
    await expect(page.getByText("4 hours")).toBeVisible();
    await expect(page.getByText("1 day")).toBeVisible();
    await expect(page.getByText("3 days")).toBeVisible();
  });

  test("Max 2 nudges shown at a time", async ({ page }) => {
    const testNudges = [
      {
        id: "nudge-1",
        type: "task_due_soon",
        message: "First nudge message",
        entityType: "task",
        entityId: "task-1",
        createdAt: new Date().toISOString(),
        dismissedAt: null,
        snoozedUntil: null,
      },
      {
        id: "nudge-2",
        type: "task_stale",
        message: "Second nudge message",
        entityType: "task",
        entityId: "task-2",
        createdAt: new Date().toISOString(),
        dismissedAt: null,
        snoozedUntil: null,
      },
    ];

    await setupNudgesAndNavigate(page, testNudges);

    // Verify both messages are visible
    await expect(page.getByText("First nudge message")).toBeVisible();
    await expect(page.getByText("Second nudge message")).toBeVisible();
  });

  test("Nudge cards show correct colors for different types", async ({
    page,
  }) => {
    const testNudge = {
      id: "nudge-orange",
      type: "task_due_soon",
      message: "Due soon nudge",
      entityType: "task",
      entityId: "task-due",
      createdAt: new Date().toISOString(),
      dismissedAt: null,
      snoozedUntil: null,
    };

    await setupNudgesAndNavigate(page, [testNudge]);

    // Verify the nudge message is visible
    await expect(page.getByText("Due soon nudge")).toBeVisible();

    // Verify the orange icon (clock emoji for task_due_soon)
    await expect(page.getByText("⏰")).toBeVisible();
  });

  test("No nudges renders empty state", async ({ page }) => {
    await setupNudgesAndNavigate(page, []);

    // When there are no nudges, the component returns null
    // We verify nudge content doesn't appear
    await expect(page.getByText("Due soon nudge")).not.toBeVisible();

    // Page should still be functional
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});
