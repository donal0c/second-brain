import { test, expect, type APIRequestContext } from "@playwright/test";
import { navigateTo, waitForLoading } from "./utils/test-helpers";

const API_BASE = process.env.VITE_API_URL || "http://localhost:3001";

async function checkLLMAvailable(request: APIRequestContext): Promise<boolean> {
  const response = await request.get(`${API_BASE}/process/status`);
  if (!response.ok()) return false;
  const body = await response.json();
  return body.data?.available === true;
}

async function getClarifications(request: APIRequestContext): Promise<{ id: string }[]> {
  const response = await request.get(`${API_BASE}/clarifications`);
  if (!response.ok()) return [];
  const body = await response.json();
  return (body.data || []).filter((c: { resolvedAt?: string }) => !c.resolvedAt);
}

test.describe("Clarifications", () => {
  test.beforeEach(async ({ page }) => {
    await navigateTo(page, "clarifications");
    await waitForLoading(page);
  });

  test("clarifications page renders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Clarifications" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refresh" })).toBeVisible();
  });

  test("pending items show questions and options", async ({ page, request }) => {
    // Check if LLM is available - clarifications require LLM processing
    const llmAvailable = await checkLLMAvailable(request);
    const clarifications = await getClarifications(request);

    if (!llmAvailable && clarifications.length === 0) {
      test.skip(true, "LLM not configured and no existing clarifications");
      return;
    }

    const emptyState = await page.getByText("No clarifications needed").isVisible().catch(() => false);
    if (emptyState) {
      test.skip(true, "No clarifications available - capture an ambiguous item to create one");
      return;
    }

    const card = page.locator("div", { has: page.getByRole("button", { name: "Resolve" }) }).first();
    await expect(card).toBeVisible();

    const question = card.getByRole("heading");
    await expect(question).toBeVisible();

    const answerInput = card.getByPlaceholder("Or type your answer...");
    await expect(answerInput).toBeVisible();
  });

  test("answer submission resolves item", async ({ page, request }) => {
    // Check if LLM is available - clarifications require LLM processing
    const llmAvailable = await checkLLMAvailable(request);
    const clarifications = await getClarifications(request);

    if (!llmAvailable && clarifications.length === 0) {
      test.skip(true, "LLM not configured and no existing clarifications");
      return;
    }

    const emptyState = await page.getByText("No clarifications needed").isVisible().catch(() => false);
    if (emptyState) {
      test.skip(true, "No clarifications available - capture an ambiguous item to create one");
      return;
    }

    const cards = page.locator("div", { has: page.getByRole("button", { name: "Resolve" }) });
    const beforeCount = await cards.count();

    const card = cards.first();
    const answerInput = card.getByPlaceholder("Or type your answer...");
    await answerInput.fill("Test answer");

    const responsePromise = page.waitForResponse((response) => {
      return response.url().includes("/clarifications/") &&
        response.url().includes("/resolve") &&
        response.request().method() === "POST";
    });

    await card.getByRole("button", { name: "Resolve" }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    await waitForLoading(page);
    const afterCount = await cards.count();
    if (beforeCount > 1) {
      expect(afterCount).toBeLessThan(beforeCount);
    } else {
      await expect(page.getByText("No clarifications needed")).toBeVisible();
    }
  });
});
