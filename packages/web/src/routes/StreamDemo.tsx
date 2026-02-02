import { useMemo, useState } from "react";
import { NeuralCard } from "../components/ui/neural/NeuralCard";
import { NeuralInput } from "../components/ui/neural/NeuralInput";
import { SynapseButton } from "../components/ui/neural/SynapseButton";
import { useUIStream } from "../lib/stream";
import { useGenerativeUI } from "../hooks/useGenerativeUI";

const DEFAULT_PROMPT =
  "Use the echo tool to echo back: Hello from the streaming demo.";

export function StreamDemo() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [includeSystemHint, setIncludeSystemHint] = useState(true);
  const endpoint = useMemo(
    () => `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/stream`,
    []
  );
  const { enabled: genUiEnabled } = useGenerativeUI();
  const { parts, status, error, start, stop, reset } = useUIStream(endpoint, {
    enabled: genUiEnabled,
  });

  const handleStart = async () => {
    if (!genUiEnabled) return;
    reset();
    const messages = [];
    if (includeSystemHint) {
      messages.push({
        role: "system",
        content:
          "You can use the echo tool when it helps. Prefer calling the tool when the user asks to echo text.",
      });
    }
    messages.push({ role: "user", content: prompt });
    await start({ messages });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Streaming Demo</h1>
          <p className="text-sm text-slate-400">
            Test the UI message stream and tool calls.
          </p>
        </div>
      </div>

      <NeuralCard padding="lg" interactive={false}>
        <div className="space-y-4">
          <label className="text-sm text-slate-300">Prompt</label>
          <NeuralInput
            size="lg"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Ask the model to call the echo tool..."
            containerClassName="w-full"
          />

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={includeSystemHint}
              onChange={(event) => setIncludeSystemHint(event.target.checked)}
              className="h-4 w-4 rounded border-void-border bg-void-100 text-neural-memory-400"
            />
            Include system hint to encourage tool use
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <SynapseButton
              variant="primary"
              size="md"
              onClick={handleStart}
              loading={status === "loading"}
            >
              Start stream
            </SynapseButton>
            <SynapseButton
              variant="secondary"
              size="md"
              onClick={stop}
              disabled={status !== "loading"}
            >
              Stop
            </SynapseButton>
            <SynapseButton
              variant="ghost"
              size="md"
              onClick={reset}
              disabled={status === "loading"}
            >
              Reset
            </SynapseButton>
            <span className="text-sm text-slate-400">
              Status: <span className="text-slate-200">{status}</span>
            </span>
          </div>
        </div>
      </NeuralCard>

      <NeuralCard padding="lg" interactive={false}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Stream Parts</h2>
            <span className="text-xs text-slate-500">{parts.length} parts</span>
          </div>
          {error && (
            <div className="text-sm text-red-400">
              Error: {error}
            </div>
          )}
          <div className="space-y-3">
            {parts.length === 0 && (
              <div className="text-sm text-slate-400">
                No stream parts yet.
              </div>
            )}
            {parts.map((part, index) => (
              <pre
                key={`${part.type}-${index}`}
                className="whitespace-pre-wrap rounded-neural bg-void-100/70 border border-void-border p-3 text-xs text-slate-200"
              >
                {JSON.stringify(part, null, 2)}
              </pre>
            ))}
          </div>
        </div>
      </NeuralCard>
    </div>
  );
}
