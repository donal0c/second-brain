import { test, expect } from "@playwright/test";

test.describe("Capture page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/capture");
  });

  test("submitting capture sends to API", async ({ page }) => {
    const textarea = page.getByRole("textbox", { name: /capture your thought/i });
    await textarea.fill("Test thought for capture");

    // Use exact name to avoid matching navbar search button
    const captureButton = page.getByRole("button", { name: "Capture", exact: true });
    await captureButton.click();

    // Wait for success message
    await expect(page.getByRole("status")).toContainText(/captured|queued/i);
  });

  test("capture input clears after successful submission", async ({ page }) => {
    const textarea = page.getByRole("textbox", { name: /capture your thought/i });
    await textarea.fill("Another test thought");

    // Use exact name to avoid matching navbar search button
    const captureButton = page.getByRole("button", { name: "Capture", exact: true });
    await captureButton.click();

    // Wait for success and verify input is cleared
    await expect(page.getByRole("status")).toBeVisible();
    await expect(textarea).toHaveValue("");
  });

  test("shows error for empty submission", async ({ page }) => {
    // Use exact name to avoid matching navbar search button
    const captureButton = page.getByRole("button", { name: "Capture", exact: true });

    // Button should be disabled when textarea is empty
    await expect(captureButton).toBeDisabled();
  });

  test("Ctrl/Cmd+Enter submits capture", async ({ page }) => {
    const textarea = page.getByRole("textbox", { name: /capture your thought/i });
    await textarea.fill("Keyboard shortcut test");

    // Use keyboard shortcut to submit
    await textarea.press("Control+Enter");

    // Wait for success message
    await expect(page.getByRole("status")).toContainText(/captured|queued/i);
  });

  test("shows capturing state during submission", async ({ page }) => {
    const textarea = page.getByRole("textbox", { name: /capture your thought/i });
    await textarea.fill("Test submission state");

    // Use exact name to avoid matching navbar search button
    const captureButton = page.getByRole("button", { name: "Capture", exact: true });
    await captureButton.click();

    // Button should show "Capturing..." during submission
    await expect(
      page.getByRole("button", { name: "Capturing...", exact: true })
    ).toBeVisible();
  });
});
