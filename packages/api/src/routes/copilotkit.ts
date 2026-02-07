import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import {
  AnthropicAdapter,
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  OpenAIAdapter,
  copilotRuntimeNodeHttpEndpoint,
  type CopilotServiceAdapter,
} from "@copilotkit/runtime";
import { resolveLLMProviderChoice } from "../llm/provider-selection.js";

function resolveCopilotAdapter(): CopilotServiceAdapter {
  const model = process.env.SECOND_BRAIN_UI_MODEL || process.env.SECOND_BRAIN_LLM_MODEL;
  const geminiApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
  const choice = resolveLLMProviderChoice();

  if (!choice) {
    return new OpenAIAdapter({ model: model || "gpt-5-mini" });
  }

  if (choice.provider === "anthropic") {
    return new AnthropicAdapter({ model: model || "claude-sonnet-4-5-20250929" });
  }

  if (choice.provider === "google") {
    return new GoogleGenerativeAIAdapter({
      model: model || "gemini-3-flash-preview",
      apiKey: geminiApiKey || choice.apiKey,
      apiVersion: "v1",
    });
  }

  // Vertex routing is handled in AG-UI via @ai-sdk/google-vertex.
  // CopilotKit runtime currently falls back to direct Gemini key if present.
  if (choice.provider === "vertex") {
    if (geminiApiKey) {
      return new GoogleGenerativeAIAdapter({
        model: model || "gemini-3-flash-preview",
        apiKey: geminiApiKey,
        apiVersion: "v1",
      });
    }
    return new OpenAIAdapter({ model: model || "gpt-5-mini" });
  }

  return new OpenAIAdapter({ model: model || "gpt-5-mini" });
}

export async function copilotKitRoutes(app: FastifyInstance): Promise<void> {
  const runtime = new CopilotRuntime();
  const handler = copilotRuntimeNodeHttpEndpoint({
    endpoint: "/copilotkit",
    runtime,
    serviceAdapter: resolveCopilotAdapter(),
  });

  const forwardRequest = async (request: FastifyRequest, reply: FastifyReply) => {
    const host = request.headers.host || "localhost";
    const protocol = (request.headers["x-forwarded-proto"] as string | undefined) || "http";
    const url = `${protocol}://${host}${request.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(request.headers)) {
      if (!value) {
        continue;
      }
      if (Array.isArray(value)) {
        for (const item of value) {
          headers.append(key, item);
        }
      } else {
        headers.set(key, value);
      }
    }

    let body: BodyInit | undefined;
    if (request.method !== "GET" && request.method !== "HEAD" && request.body !== undefined) {
      if (typeof request.body === "string" || request.body instanceof Uint8Array) {
        body = request.body as BodyInit;
      } else {
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
        body = JSON.stringify(request.body);
      }
    }

    const handlerResult = await handler(
      new Request(url, {
        method: request.method,
        headers,
        body,
      }),
    );
    if (!(handlerResult instanceof Response)) {
      throw new Error("Copilot runtime handler returned no response");
    }
    const runtimeResponse = handlerResult;

    reply.code(runtimeResponse.status);
    runtimeResponse.headers.forEach((value, key) => {
      reply.header(key, value);
      reply.raw.setHeader(key, value);
    });

    if (runtimeResponse.body) {
      reply.hijack();
      Readable.fromWeb(runtimeResponse.body as unknown as NodeReadableStream<Uint8Array>).pipe(
        reply.raw,
      );
      return reply;
    }

    return reply.send();
  };

  app.all("/copilotkit", forwardRequest);
  app.all("/copilotkit/*", forwardRequest);
}
