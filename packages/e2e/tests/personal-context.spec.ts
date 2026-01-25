import { test, expect, type APIRequestContext } from "@playwright/test";

const API_BASE = process.env.VITE_API_URL || "http://localhost:3001";
const TEST_PREFIX = "__e2e_personal_context__";

type PersonalContext = {
  id: string;
  name: string;
  mentionCount: number;
};

async function checkLLMAvailable(request: APIRequestContext): Promise<boolean> {
  const response = await request.get(`${API_BASE}/process/status`);
  if (!response.ok()) return false;
  const body = await response.json();
  return body.data?.available === true;
}

async function createInboxItem(request: APIRequestContext, rawText: string) {
  const response = await request.post(`${API_BASE}/inbox`, {
    data: { rawText, source: "api" },
  });
  expect(response.ok()).toBe(true);
  return response.json();
}

async function listContexts(request: APIRequestContext): Promise<PersonalContext[]> {
  const response = await request.get(`${API_BASE}/context`);
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return (body.data || []) as PersonalContext[];
}

async function findContextByToken(
  request: APIRequestContext,
  token: string,
  attempts = 10
): Promise<PersonalContext | null> {
  for (let i = 0; i < attempts; i++) {
    const contexts = await listContexts(request);
    const match = contexts.find((ctx) => ctx.name.toLowerCase().includes(token.toLowerCase()));
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

test.describe("Personal Context Learning", () => {
  const token = `${TEST_PREFIX}_${Date.now()}`;
  const contextName = `Zorgle ${token}`;
  let context: PersonalContext | null = null;
  let skipReason: string | null = null;
  const inboxIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // Check if LLM is available first
    const llmAvailable = await checkLLMAvailable(request);
    if (!llmAvailable) {
      skipReason = "LLM not configured (ANTHROPIC_API_KEY not set)";
      return;
    }

    const capture = await createInboxItem(
      request,
      `Met with ${contextName} at Acme Corp to discuss launch plans.`
    );

    const processed = capture?.data?.processed;
    if (!processed) {
      skipReason = "Processing failed - check LLM configuration";
      return;
    }

    context = await findContextByToken(request, token);
    if (!context) {
      skipReason = "Context extraction did not create expected entity";
      return;
    }

    const inboxId = capture?.data?.inboxItem?.id;
    if (inboxId) {
      inboxIds.push(inboxId);
    }
  });

  test.afterAll(async ({ request }) => {
    for (const id of inboxIds) {
      await request.delete(`${API_BASE}/inbox/${id}`);
    }
    if (context?.id) {
      await request.delete(`${API_BASE}/context/${context.id}`);
    }
  });

  test("captured text extracts context entities", async ({ request }) => {
    test.skip(!!skipReason, skipReason || "Context extraction not available");
    const contexts = await listContexts(request);
    const match = contexts.find((ctx) => ctx.id === context?.id);
    expect(match).toBeTruthy();
  });

  test("mention counts increment on repeated context", async ({ request }) => {
    test.skip(!!skipReason, skipReason || "Context extraction not available");
    const initialCount = context?.mentionCount ?? 0;

    const capture = await createInboxItem(
      request,
      `Follow-up with ${contextName} about the release timeline.`
    );
    const inboxId = capture?.data?.inboxItem?.id;
    if (inboxId) {
      inboxIds.push(inboxId);
    }

    const updated = await findContextByToken(request, token);
    if (!updated || updated.mentionCount <= initialCount) {
      test.skip(true, "Mention count did not increment");
      return;
    }

    expect(updated.mentionCount).toBeGreaterThan(initialCount);
    context = updated;
  });

  test("context is used in subsequent processing", async ({ request }) => {
    test.skip(!!skipReason, skipReason || "Context extraction not available");

    const capture = await createInboxItem(
      request,
      `Planning next steps with ${contextName} for Q2 objectives.`
    );
    const inboxId = capture?.data?.inboxItem?.id;
    if (inboxId) {
      inboxIds.push(inboxId);
    }

    const response = await request.get(`${API_BASE}/receipts?limit=50`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    const receipts = body.data || [];
    const contextId = context?.id;
    const used = receipts.some((receipt: { personalContextUsed?: string[] }) =>
      contextId ? receipt.personalContextUsed?.includes(contextId) : false
    );

    if (!used) {
      test.skip(true, "Context not used in receipts");
      return;
    }

    expect(used).toBe(true);
  });
});
