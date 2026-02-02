// =============================================================================
// Browse Stream API Tests
// =============================================================================
// Run with: npx tsx packages/api/src/routes/browse.stream.api.test.ts

import Fastify, { type FastifyInstance } from "fastify";
import { browseRoutes } from "./browse.js";

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
  await app.register(browseRoutes);
  return app;
}

const tests = [
  test("OPTIONS /browse/stream returns 204", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "OPTIONS",
      url: "/browse/stream",
      headers: { origin: "http://localhost:5173" },
    });
    assertEqual(response.statusCode, 204, "Should return 204 for OPTIONS");
    await app.close();
  }),

  test("POST /browse/stream returns 400 for invalid payload", async () => {
    const app = await buildTestApp();
    const response = await app.inject({
      method: "POST",
      url: "/browse/stream",
      payload: { nope: true },
    });
    assertEqual(response.statusCode, 400, "Should return 400 for invalid payload");
    await app.close();
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
