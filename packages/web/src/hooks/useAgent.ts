import { useCallback, useMemo, useRef, useState } from "react";

type AgentEventType =
  | "RUN_STARTED"
  | "TEXT_MESSAGE_CONTENT"
  | "STATE_DELTA"
  | "RUN_FINISHED"
  | "TOOL_CALL_START"
  | "TOOL_CALL_END";

export type AgentEvent = {
  type: AgentEventType;
  [key: string]: unknown;
};

export type AgentDeclarativeAction = {
  id: string;
  label: string;
  action: string;
  kind?: "primary" | "secondary";
  payload?: Record<string, unknown>;
};

export type AgentDeclarativeBlock =
  | { type: "card"; title: string; body?: string }
  | { type: "list"; title?: string; items: string[] }
  | { type: "actions"; title?: string; actions: AgentDeclarativeAction[] }
  | { type: "notice"; tone?: "info" | "warning" | "success"; text: string };

export type AgentState = {
  ui?: {
    title?: string;
    blocks: AgentDeclarativeBlock[];
  };
  draftAnswers?: Record<string, string>;
  [key: string]: unknown;
};

export type AgentStatus = "idle" | "loading" | "done" | "error";

type UseAgentParams = {
  feature: "digest" | "browse" | "clarifications";
};

type AgentInteraction = {
  type?: "user_action" | "user_message";
  action?: string;
  itemId?: string;
  text?: string;
};

type RunOptions = {
  state?: Record<string, unknown>;
  interaction?: AgentInteraction;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeState(base: AgentState, delta: Record<string, unknown>): AgentState {
  const next: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(delta)) {
    if (isRecord(value) && isRecord(next[key])) {
      next[key] = mergeState(next[key] as AgentState, value);
      continue;
    }
    next[key] = value;
  }
  return next as AgentState;
}

function parseSseBlock(block: string): AgentEvent | null {
  const lines = block.split("\n");
  const dataLines = lines.filter((line) => line.startsWith("data:"));
  if (dataLines.length === 0) return null;
  const payload = dataLines
    .map((line) => line.replace(/^data:\s?/, ""))
    .join("\n");
  try {
    return JSON.parse(payload) as AgentEvent;
  } catch {
    return null;
  }
}

export function useAgent({ feature }: UseAgentParams) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [status, setStatus] = useState<AgentStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AgentState>({});
  const abortRef = useRef<AbortController | null>(null);
  const endpoint = useMemo(
    () => `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/agui/run`,
    []
  );

  const reset = useCallback(() => {
    setEvents([]);
    setStatus("idle");
    setError(null);
    setState({});
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStatus("idle");
  }, []);

  const run = useCallback(
    async (payload: Record<string, unknown>, options?: RunOptions) => {
      setStatus("loading");
      setError(null);
      setEvents([]);
      setState({});

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const token = import.meta.env.VITE_API_AUTH_TOKEN;
      let response: Response;
      try {
        response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            feature,
            payload,
            state: options?.state ?? {},
            interaction: options?.interaction,
          }),
          signal: controller.signal,
        });
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus("idle");
          return;
        }
        setError(err instanceof Error ? err.message : "AG-UI request failed");
        setStatus("error");
        return;
      }

      if (!response.ok || !response.body) {
        let message = response.ok
          ? "Missing AG-UI stream body"
          : `AG-UI request failed (${response.status})`;
        if (!response.ok) {
          try {
            const errorPayload = (await response.json()) as {
              error?: { message?: string } | string;
              message?: string;
            };
            if (typeof errorPayload?.message === "string" && errorPayload.message.trim()) {
              message = errorPayload.message;
            } else if (
              typeof errorPayload?.error === "object" &&
              typeof errorPayload.error?.message === "string" &&
              errorPayload.error.message.trim()
            ) {
              message = errorPayload.error.message;
            } else if (typeof errorPayload?.error === "string" && errorPayload.error.trim()) {
              message = errorPayload.error;
            }
          } catch {
            // Fall back to status-based message when response body is not JSON.
          }
        }
        setError(message || "AG-UI run failed");
        setStatus("error");
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";

          for (const block of blocks) {
            const parsed = parseSseBlock(block);
            if (!parsed) continue;
            setEvents((prev) => prev.concat(parsed));
            if (parsed.type === "STATE_DELTA" && isRecord(parsed.delta)) {
              setState((prev) => mergeState(prev, parsed.delta));
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setStatus("idle");
          return;
        }
        setError(err instanceof Error ? err.message : "AG-UI stream failed");
        setStatus("error");
        return;
      }

      if (!controller.signal.aborted) {
        setStatus("done");
      }
    },
    [endpoint, feature]
  );

  const latestText = useMemo(() => {
    const chunks = events
      .filter((event) => event.type === "TEXT_MESSAGE_CONTENT")
      .map((event) => String(event.content || ""));
    return chunks.join("\n").trim();
  }, [events]);

  return { events, latestText, status, error, state, run, stop, reset };
}
