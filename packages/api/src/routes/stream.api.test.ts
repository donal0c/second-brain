// =============================================================================
// Stream API Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/stream.api.test.ts

import Fastify, { type FastifyInstance } from "fastify";
import { streamRoutes } from "./stream.js";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void>) {
  return { name, fn };
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(streamRoutes);
  return app;
}

const tests = [
  test("OPTIONS /stream returns 204 and CORS headers", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "OPTIONS",
      url: "/stream",
      headers: { origin: "http://localhost:5173" },
    });
    assertEqual(response.statusCode, 204, "Should return 204 for OPTIONS");
    assertEqual(
      response.headers["access-control-allow-origin"],
      "http://localhost:5173",
      "Should echo Origin"
    );
    await app.close();
  }),

  test("POST /stream returns 400 for invalid payload", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/stream",
      payload: { notMessages: true },
    });
    assertEqual(response.statusCode, 400, "Should return 400 for invalid payload");
    await app.close();
  }),

  test("POST /stream returns 503 when provider not configured", async () => {
    const app = await buildTestApp();
    const originalOpenAiKey = process.env.OPENAI_API_KEY;
    const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      const response = await app.inject({
        method: "POST",
        url: "/stream",
        payload: { messages: [] },
      });
      assertEqual(response.statusCode, 503, "Should return 503 when provider not configured");
    } finally {
      if (originalOpenAiKey !== undefined) {
        process.env.OPENAI_API_KEY = originalOpenAiKey;
      }
      if (originalAnthropicKey !== undefined) {
        process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
      }
      await app.close();
    }
  }),
];

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ ${name}`);
      console.error(err);
      failed++;
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
