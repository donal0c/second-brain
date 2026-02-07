import { useState, useEffect } from "react";
import { clarifications, inbox, extractErrorMessage, type Clarification } from "../lib/api";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { useCopilotReadable } from "@copilotkit/react-core";
import { useAgent } from "../hooks/useAgent";
import { DeclarativePanel } from "../components/agent/DeclarativePanel";

export function Clarifications() {
  const [items, setItems] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inboxTexts, setInboxTexts] = useState<Record<string, string>>({});
  const {
    latestText: agentClarificationsText,
    status: agentStatus,
    state: agentState,
    run: runClarificationsAgent,
  } = useAgent({ feature: "clarifications" });

  const loadClarifications = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await clarifications.list({ resolved: "false" }, signal);
      setItems(response.items);

      const texts: Record<string, string> = {};
      await Promise.all(
        response.items.map(async (clarification) => {
          try {
            const inboxItem = await inbox.get(clarification.inboxItemId, signal);
            texts[clarification.inboxItemId] = inboxItem.rawText;
          } catch (loadErr) {
            if (loadErr instanceof Error && loadErr.name === "AbortError") {
              throw loadErr;
            }
            texts[clarification.inboxItemId] = "(Could not load original text)";
          }
        })
      );
      setInboxTexts(texts);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadClarifications(controller.signal);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (loading || error || items.length === 0) {
      return;
    }
    void runClarificationsAgent({
      count: items.length,
      items: items.slice(0, 8).map((item) => ({
        id: item.id,
        question: item.question,
        options: item.options ?? [],
      })),
    });
  }, [loading, error, items, runClarificationsAgent]);

  useEffect(() => {
    const draftAnswers = agentState.draftAnswers;
    if (!draftAnswers || typeof draftAnswers !== "object") {
      return;
    }
    const drafts = Object.entries(draftAnswers).filter(
      (entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"
    );
    if (drafts.length === 0) {
      return;
    }
    setAnswers((prev) => {
      const next = { ...prev };
      for (const [itemId, draft] of drafts) {
        next[itemId] = draft;
      }
      return next;
    });
  }, [agentState]);

  useCopilotReadable(
    {
      description: "Pending clarification questions requiring user answers.",
      value: items.slice(0, 10).map((item) => ({
        id: item.id,
        question: item.question,
        options: item.options ?? [],
      })),
      available: !loading && items.length > 0,
    },
    [items, loading]
  );

  const handleResolve = async (id: string) => {
    const answer = answers[id];
    if (!answer?.trim()) {
      return;
    }

    setResolvingId(id);
    setError(null);

    try {
      await clarifications.resolve(id, answer.trim());
      await loadClarifications();
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setResolvingId(null);
    }
  };

  const handleDraftAnswer = async (item: Clarification) => {
    const originalText = inboxTexts[item.inboxItemId] || "";
    await runClarificationsAgent(
      {
        count: items.length,
        item: {
          id: item.id,
          question: item.question,
          options: item.options ?? [],
          originalText,
        },
      },
      {
        state: {
          activeClarificationId: item.id,
          existingAnswer: answers[item.id] || "",
        },
        interaction: {
          type: "user_action",
          action: "draft_answer",
          itemId: item.id,
        },
      }
    );
  };

  const updateAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const renderAnswerControls = (item: Clarification) => (
    <div className="flex gap-2">
      <input
        type="text"
        value={answers[item.id] || ""}
        onChange={(e) => updateAnswer(item.id, e.target.value)}
        placeholder="Type your answer or draft with agent..."
        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
        disabled={resolvingId === item.id}
      />
      <button
        onClick={() => void handleDraftAnswer(item)}
        disabled={resolvingId === item.id || agentStatus === "loading"}
        className="px-4 py-2 bg-slate-700 text-slate-100 rounded-lg text-sm hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {agentStatus === "loading" ? "Drafting..." : "Draft"}
      </button>
      <button
        onClick={() => void handleResolve(item.id)}
        disabled={!answers[item.id]?.trim() || resolvingId === item.id}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {resolvingId === item.id ? "Resolving..." : "Resolve"}
      </button>
    </div>
  );

  return (
    <div className="p-6 md:p-8 min-h-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white font-display">Clarifications</h2>
          <p className="text-slate-400 mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} need{items.length === 1 ? "s" : ""} your input
          </p>
        </div>
        <button
          onClick={() => void loadClarifications()}
          className="px-3 py-1 text-sm text-slate-400 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => void loadClarifications()} />}

      {agentClarificationsText && (
        <div className="bg-slate-800/50 rounded-lg border border-neural-memory-500/20 p-4">
          <div className="text-xs uppercase tracking-wide text-neural-memory-400 mb-2">
            Agent Guidance {agentStatus === "loading" ? "(updating)" : ""}
          </div>
          <p className="text-sm text-slate-200 whitespace-pre-wrap">{agentClarificationsText}</p>
        </div>
      )}
      <DeclarativePanel
        state={agentState}
        onAction={(action) => {
          if (action.action === "draft_answer" && typeof action.payload?.itemId === "string") {
            const item = items.find((candidate) => candidate.id === action.payload?.itemId);
            if (item) {
              void handleDraftAnswer(item);
            }
          }
        }}
      />

      {loading ? (
        <LoadingSkeleton count={2} />
      ) : items.length === 0 ? (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-8 text-center">
          <p className="text-slate-400">No clarifications needed. Everything is clear!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6"
            >
              <div className="bg-slate-800/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-400 mb-1">Original capture:</p>
                <p className="text-white whitespace-pre-wrap">{inboxTexts[item.inboxItemId] || "Loading..."}</p>
              </div>

              <div className="mb-4">
                <h4 className="font-medium text-white mb-2">{item.question}</h4>
                {item.options && item.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => updateAnswer(item.id, option)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          answers[item.id] === option
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-slate-800/50 text-slate-400 border-slate-700 hover:bg-slate-800"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                {renderAnswerControls(item)}
              </div>

              <div className="text-xs text-slate-500">Asked {new Date(item.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
