import { useCallback, useRef, useState } from "react";

export type UIMessageChunk = {
  type: string;
  [key: string]: unknown;
};

export type UIStreamStatus = "idle" | "loading" | "done" | "error";

export type UIStreamResult = {
  parts: UIMessageChunk[];
  status: UIStreamStatus;
  error: string | null;
  start: (payload: unknown) => Promise<void>;
  stop: () => void;
  reset: () => void;
};

const API_AUTH_TOKEN = import.meta.env.VITE_API_AUTH_TOKEN;

function parseSseLines(chunk: string): { events: string[]; rest: string } {
  const delimiter = "\n\n";
  const parts = chunk.split(delimiter);
  if (parts.length === 1) {
    return { events: [], rest: parts[0] };
  }
  return { events: parts.slice(0, -1), rest: parts[parts.length - 1] };
}

function extractData(lineBlock: string): string[] {
  return lineBlock
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace(/^data:\s?/, "").trim())
    .filter(Boolean);
}

export function useUIStream(endpoint: string): UIStreamResult {
  const [parts, setParts] = useState<UIStreamPart[]>([]);
  const [status, setStatus] = useState<UIStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setParts([]);
    setStatus("idle");
    setError(null);
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const start = useCallback(
    async (payload: unknown) => {
      setStatus("loading");
      setError(null);
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
        },
        body: JSON.stringify(payload ?? {}),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const message = response.ok ? "Streaming response missing body" : response.statusText;
        throw new Error(message || "Stream request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSseLines(buffer);
          buffer = parsed.rest;

          for (const event of parsed.events) {
            for (const data of extractData(event)) {
              if (data === "[DONE]") continue;
              try {
                const part = JSON.parse(data) as UIMessageChunk;
                setParts((prev) => prev.concat(part));
              } catch (err) {
                console.warn("Failed to parse stream part", err);
              }
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus("idle");
          return;
        }
        setError(err instanceof Error ? err.message : "Stream failed");
        setStatus("error");
        return;
      }

      if (!controller.signal.aborted) {
        setStatus("done");
      }
    },
    [endpoint]
  );

  return { parts, status, error, start, stop, reset };
}
