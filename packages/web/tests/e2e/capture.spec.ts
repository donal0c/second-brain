import { test, expect } from "@playwright/test";

test.describe("Capture page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/capture");
  });

  test("capture page loads with textarea", async ({ page }) => {
    // Use the actual placeholder text
    const textarea = page.getByPlaceholder("What's on your mind?");
    await expect(textarea).toBeVisible();
  });

  test("capture button is disabled when empty", async ({ page }) => {
    const captureButton = page.getByRole("button", { name: "Capture", exact: true });
    await expect(captureButton).toBeDisabled();
  });

  test("capture button enables when text is entered", async ({ page }) => {
    const textarea = page.getByPlaceholder("What's on your mind?");
    await textarea.fill("Test thought");

    const captureButton = page.getByRole("button", { name: "Capture", exact: true });
    await expect(captureButton).toBeEnabled();
  });

  test("can type in capture textarea", async ({ page }) => {
    const textarea = page.getByPlaceholder("What's on your mind?");
    await textarea.fill("Test capture content");
    await expect(textarea).toHaveValue("Test capture content");
  });

  test("handles special characters", async ({ page }) => {
    const textarea = page.getByPlaceholder("What's on your mind?");
    const specialText = "Test @#$%^&*() special chars";
    await textarea.fill(specialText);
    await expect(textarea).toHaveValue(specialText);
  });
});
