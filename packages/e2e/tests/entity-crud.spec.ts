import { test, expect, type APIRequestContext } from "@playwright/test";
import { navigateTo, waitForLoading } from "./utils/test-helpers";

/**
 * Wait for the edit modal to be fully stable after URL navigation.
 * The Browse component clears URL params after opening the modal,
 * which can cause element detachment if we interact too quickly.
 */
async function waitForModalStable(page: import("@playwright/test").Page) {
  // Wait for the Edit heading to be visible
  await expect(page.getByRole("heading", { name: /^Edit (Task|Project|Idea|Person)$/ })).toBeVisible();
  // Wait for URL to stabilize (params get cleared)
  await page.waitForURL(/\/browse$/);
  // Small delay for React to settle
  await page.waitForTimeout(100);
}

const API_BASE = process.env.VITE_API_URL || "http://localhost:3001";
const TEST_PREFIX = "__e2e_entity_crud__";

async function createEntity<T>(
  request: APIRequestContext,
  endpoint: string,
  payload: Record<string, unknown>
): Promise<T> {
  const response = await request.post(`${API_BASE}${endpoint}`, { data: payload });
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.data as T;
}

async function deleteEntity(request: APIRequestContext, endpoint: string, id?: string) {
  if (!id) return;
  await request.delete(`${API_BASE}${endpoint}/${id}`);
}

type Task = { id: string; title: string; nextAction: string };
type Project = { id: string; name: string };
type Idea = { id: string; title: string };
type Person = { id: string; name: string };

test.describe("Entity CRUD (Browse)", () => {
  let task: Task;
  let nleTask: Task;
  let deleteTask: Task;
  let project: Project;
  let idea: Idea;
  let person: Person;

  test.beforeAll(async ({ request }) => {
    const suffix = Date.now();
    task = await createEntity<Task>(request, "/tasks", {
      title: `${TEST_PREFIX} Task ${suffix}`,
      nextAction: "Review CRUD test",
      status: "active",
    });
    nleTask = await createEntity<Task>(request, "/tasks", {
      title: `${TEST_PREFIX} Task NLE ${suffix}`,
      nextAction: "Original next action",
      status: "active",
    });
    deleteTask = await createEntity<Task>(request, "/tasks", {
      title: `${TEST_PREFIX} Task Delete ${suffix}`,
      nextAction: "Remove me",
      status: "active",
    });
    project = await createEntity<Project>(request, "/projects", {
      name: `${TEST_PREFIX} Project ${suffix}`,
      desiredOutcome: "Ship CRUD tests",
      status: "active",
    });
    idea = await createEntity<Idea>(request, "/ideas", {
      title: `${TEST_PREFIX} Idea ${suffix}`,
      summary: "E2E CRUD idea",
    });
    person = await createEntity<Person>(request, "/persons", {
      name: `${TEST_PREFIX} Person ${suffix}`,
      relationshipContext: "E2E contact",
    });
  });

  test.afterAll(async ({ request }) => {
    await deleteEntity(request, "/tasks", task?.id);
    await deleteEntity(request, "/tasks", nleTask?.id);
    await deleteEntity(request, "/tasks", deleteTask?.id);
    await deleteEntity(request, "/projects", project?.id);
    await deleteEntity(request, "/ideas", idea?.id);
    await deleteEntity(request, "/persons", person?.id);
  });

  test("browse page lists all entity types", async ({ page }) => {
    await navigateTo(page, "browse");
    await expect(page.getByRole("button", { name: /Tasks/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Projects/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Ideas/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /People/i })).toBeVisible();
  });

  test("entity detail view works for tasks", async ({ page }) => {
    await page.goto(`/browse?type=task&id=${task.id}`);
    await expect(page.getByRole("heading", { name: "Edit Task" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Delete Task" })).toBeVisible();
  });

  test("edit modal opens and saves changes", async ({ page }) => {
    const updatedTitle = `${task.title} Updated`;
    await page.goto(`/browse?type=task&id=${task.id}`);
    await waitForModalStable(page);

    // Click "Show all fields" and wait for the fields to expand
    await page.getByRole("button", { name: /Show all fields/i }).click();
    const titleInput = page.getByLabel("Title");
    await expect(titleInput).toBeVisible({ timeout: 5000 });
    await titleInput.fill(updatedTitle);

    const responsePromise = page.waitForResponse((response) => {
      return response.url().includes(`/tasks/${task.id}`) &&
        response.request().method() === "PATCH";
    });
    await page.getByRole("button", { name: /Save All Changes/i }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    // Use aria-label for the modal close button (X icon)
    await page.getByLabel("Close modal").click();
    await waitForLoading(page);

    await expect(page.getByText(updatedTitle)).toBeVisible();
  });

  test("filter and sort controls work", async ({ page }) => {
    await navigateTo(page, "browse");
    const searchInput = page.getByPlaceholder("Search tasks...");
    await expect(searchInput).toBeVisible();

    const sortSelect = page.locator("select").first();
    await sortSelect.selectOption("title");
    await expect(sortSelect).toHaveValue("title");

    const completedFilter = page.getByRole("button", { name: "Completed" });
    await completedFilter.click();
    await expect(completedFilter).toHaveClass(/bg-slate-600/);
  });

  test("natural language edit works when LLM is configured", async ({ page }) => {
    const updatedAction = "Follow up with the client";
    await page.goto(`/browse?type=task&id=${nleTask.id}`);
    await waitForModalStable(page);

    const quickEditInput = page.getByPlaceholder(/Move to September/i);
    await quickEditInput.fill(`Change next action to ${updatedAction}`);

    const responsePromise = page.waitForResponse((response) => {
      return response.url().includes(`/tasks/${nleTask.id}/interpret`) &&
        response.request().method() === "POST";
    });
    await page.getByRole("button", { name: "Update" }).click();
    const response = await responsePromise;

    if (response.status() === 503) {
      test.skip(true, "LLM provider not configured");
      return;
    }

    expect(response.ok()).toBe(true);
    await expect(page.getByText("Saved successfully!")).toBeVisible();

    // Use aria-label for the modal close button (X icon)
    await page.getByLabel("Close modal").click();
    await waitForLoading(page);
    await expect(page.getByText(updatedAction)).toBeVisible();
  });

  test("delete confirmation removes entity", async ({ page }) => {
    await page.goto(`/browse?type=task&id=${deleteTask.id}`);
    await waitForModalStable(page);

    page.once("dialog", (dialog) => dialog.accept());
    const responsePromise = page.waitForResponse((response) => {
      return response.url().includes(`/tasks/${deleteTask.id}`) &&
        response.request().method() === "DELETE";
    });
    await page.getByRole("button", { name: "Delete Task" }).click();
    const response = await responsePromise;
    expect(response.ok()).toBe(true);

    await expect(page.getByRole("heading", { name: "Edit Task" })).not.toBeVisible();
    await expect(page.getByText(deleteTask.title)).not.toBeVisible();
  });
});
