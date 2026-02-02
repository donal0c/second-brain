import { useState, useEffect, useMemo } from "react";
import { clarifications, inbox, extractErrorMessage, type Clarification } from "../lib/api";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { useUIStream, type UIMessageChunk } from "../lib/stream";
import { useGenerativeUI } from "../hooks/useGenerativeUI";
import {
  ClarificationMultipleChoice,
  type ClarificationChoiceOption,
} from "../components/clarification";
import { UISpecRenderer, type UISpecSection } from "../components/generative/UISpecRenderer";
import {
  AlertSection,
  EntityListSection,
  ActionListSection,
  SummarySection,
  EmptyStateSection,
  EntityCardSection,
  TimelineSection,
  CalendarSection,
  ChartSection,
} from "../components/generative/sections";

export function Clarifications() {
  const [items, setItems] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inboxTexts, setInboxTexts] = useState<Record<string, string>>({});
  const { enabled: genUiEnabled } = useGenerativeUI();
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_URL || "http://localhost:3001",
    []
  );

  const loadClarifications = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await clarifications.list({ resolved: "false" }, signal);
      setItems(response.items);

      // Load the original inbox text for each clarification
      const texts: Record<string, string> = {};
      await Promise.all(
        response.items.map(async (c) => {
          try {
            const inboxItem = await inbox.get(c.inboxItemId, signal);
            texts[c.inboxItemId] = inboxItem.rawText;
          } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
              throw error;
            }
            texts[c.inboxItemId] = "(Could not load original text)";
          }
        })
      );
      setInboxTexts(texts);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadClarifications(controller.signal);
    return () => controller.abort();
  }, []);

  const handleResolve = async (id: string) => {
    const answer = answers[id];
    if (!answer?.trim()) return;

    setResolvingId(id);
    setError(null);

    try {
      await clarifications.resolve(id, answer.trim());
      // Reload to get updated list
      await loadClarifications();
      // Clear the answer
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

  const updateAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const renderFallback = (item: Clarification) => (
    <div className="mb-4">
      <h4 className="font-medium text-white mb-2">{item.question}</h4>
      {item.options && item.options.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {item.options.map((option, i) => (
            <button
              key={i}
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
      <div className="flex gap-2">
        <input
          type="text"
          value={answers[item.id] || ""}
          onChange={(e) => updateAnswer(item.id, e.target.value)}
          placeholder="Or type your answer..."
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
          disabled={resolvingId === item.id}
        />
        <button
          onClick={() => handleResolve(item.id)}
          disabled={!answers[item.id]?.trim() || resolvingId === item.id}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {resolvingId === item.id ? "Resolving..." : "Resolve"}
        </button>
      </div>
    </div>
  );

  const ClarificationStreamCard = ({ item }: { item: Clarification }) => {
    const endpoint = `${apiBase}/clarifications/${item.id}/stream`;
    const { parts, status, error: streamError, start } = useUIStream(endpoint, {
      enabled: genUiEnabled,
    });

    useEffect(() => {
      if (!genUiEnabled) {
        return;
      }
      start({});
    }, [start, genUiEnabled]);

    const toolOutput = useMemo(() => {
      const outputs = parts.filter(
        (part: UIMessageChunk) => part.type === "tool-output-available"
      );
      const latest = outputs[outputs.length - 1] as
        | {
            output?: Record<string, unknown>;
          }
        | undefined;
      return latest?.output ?? null;
    }, [parts]);

    if (streamError || !genUiEnabled) {
      return renderFallback(item);
    }

    if (!toolOutput) {
      return (
        <div className="text-sm text-slate-400">
          {status === "loading" ? "Loading suggestion..." : "No suggestion available."}
        </div>
      );
    }

    if (toolOutput.componentType !== "UISpec") {
      return renderFallback(item);
    }

    return (
      <UISpecRenderer
        spec={toolOutput as any}
        renderSection={(section: UISpecSection) => {
          const data = section.data || {};
          switch (section.type) {
            case "alert":
              return (
                <AlertSection
                  title={section.title}
                  content={String((data as any).content || item.question)}
                  style={section.style}
                />
              );
            case "entity-card":
              return (
                <EntityCardSection
                  title={section.title}
                  entity={(data as any).entity}
                />
              );
            case "entity-list":
              return (
                <EntityListSection
                  title={section.title}
                  entities={((data as any).entities as any[]) || []}
                />
              );
            case "action-list": {
              const items = ((data as any).items as any[]) || [];
              if (items.length > 0) {
                return (
                  <ClarificationMultipleChoice
                    question={section.title || item.question}
                    options={items.map((option: any) => ({
                      label: String(option.label ?? option.value ?? option),
                      value: String(option.value ?? option.label ?? option),
                    })) as ClarificationChoiceOption[]}
                    selectedValue={answers[item.id]}
                    onSelect={(value) => updateAnswer(item.id, value)}
                  />
                );
              }
              return null;
            }
            case "summary":
              return (
                <SummarySection
                  title={section.title}
                  content={String((data as any).content || "")}
                />
              );
            case "timeline":
              return <TimelineSection title={section.title} data={data as any} />;
            case "calendar":
              return <CalendarSection title={section.title} data={data as any} />;
            case "chart":
              return <ChartSection title={section.title} data={data as any} />;
            case "empty-state":
              return (
                <EmptyStateSection
                  title={section.title}
                  message={String((data as any).message || "")}
                />
              );
            default:
              return null;
          }
        }}
      />
    );
  };

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
          onClick={() => loadClarifications()}
          className="px-3 py-1 text-sm text-slate-400 hover:text-white"
        >
          Refresh
        </button>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => loadClarifications()} />}

      {loading ? (
        <LoadingSkeleton count={2} />
      ) : items.length === 0 ? (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-8 text-center">
          <p className="text-slate-400">
            No clarifications needed. Everything is clear!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-6"
            >
              {/* Original text */}
              <div className="bg-slate-800/30 rounded-lg p-3 mb-4">
                <p className="text-sm text-slate-400 mb-1">Original capture:</p>
                <p className="text-white whitespace-pre-wrap">
                  {inboxTexts[item.inboxItemId] || "Loading..."}
                </p>
              </div>

              {/* Question */}
              <div className="mb-4 space-y-4">
                <ClarificationStreamCard item={item} />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleResolve(item.id)}
                    disabled={!answers[item.id]?.trim() || resolvingId === item.id}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resolvingId === item.id ? "Resolving..." : "Resolve"}
                  </button>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-slate-500">
                Asked {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
