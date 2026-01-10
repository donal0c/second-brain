import { useState, useEffect } from "react";
import { clarifications, inbox, type Clarification, type ApiError } from "../lib/api";

export function Clarifications() {
  const [items, setItems] = useState<Clarification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inboxTexts, setInboxTexts] = useState<Record<string, string>>({});

  const loadClarifications = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await clarifications.list({ resolved: "false" }, signal);
      setItems(response.clarifications);

      // Load the original inbox text for each clarification
      const texts: Record<string, string> = {};
      await Promise.all(
        response.clarifications.map(async (c) => {
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
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to load clarifications");
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
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to resolve clarification");
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clarifications</h2>
          <p className="text-gray-600 mt-1">
            {items.length} item{items.length !== 1 ? "s" : ""} need{items.length === 1 ? "s" : ""} your input
          </p>
        </div>
        <button
          onClick={() => loadClarifications()}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => loadClarifications()} className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            No clarifications needed. Everything is clear!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              {/* Original text */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-600 mb-1">Original capture:</p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {inboxTexts[item.inboxItemId] || "Loading..."}
                </p>
              </div>

              {/* Question */}
              <div className="mb-4">
                <h4 className="font-medium text-gray-900 mb-2">{item.question}</h4>

                {/* Options */}
                {item.options && item.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {item.options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => setAnswers((prev) => ({ ...prev, [item.id]: option }))}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          answers[item.id] === option
                            ? "bg-gray-900 text-white border-gray-900"
                            : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}

                {/* Custom answer input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={answers[item.id] || ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Or type your answer..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    disabled={resolvingId === item.id}
                  />
                  <button
                    onClick={() => handleResolve(item.id)}
                    disabled={!answers[item.id]?.trim() || resolvingId === item.id}
                    className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resolvingId === item.id ? "Resolving..." : "Resolve"}
                  </button>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-400">
                Asked {new Date(item.createdAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
