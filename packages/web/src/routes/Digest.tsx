import { useState, useEffect } from "react";
import {
  digest,
  type DigestResponse,
  type ApiError,
} from "../lib/api";

export function Digest() {
  const [data, setData] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<"all" | "work" | "personal">("all");

  const loadDigest = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await digest.daily({ context }, signal);
      setData(response);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to load digest");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDigest(controller.signal);
    return () => controller.abort();
  }, [context]);

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date < today) return { text: "Overdue", color: "text-red-600" };
    if (date.toDateString() === today.toDateString()) return { text: "Today", color: "text-orange-600" };
    if (date.toDateString() === tomorrow.toDateString()) return { text: "Tomorrow", color: "text-yellow-600" };
    return { text: date.toLocaleDateString(), color: "text-gray-500" };
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Daily Digest</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Daily Digest</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => loadDigest()} className="ml-2 underline hover:no-underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Daily Digest</h2>
          <p className="text-gray-600 mt-1">{data?.date}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={context}
            onChange={(e) => setContext(e.target.value as "all" | "work" | "personal")}
            className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All</option>
            <option value="work">Work</option>
            <option value="personal">Personal</option>
          </select>
          <button
            onClick={() => loadDigest()}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{data?.stats.activeTasks}</div>
          <div className="text-sm text-gray-500">Active Tasks</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{data?.stats.activeProjects}</div>
          <div className="text-sm text-gray-500">Active Projects</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{data?.stats.ideas}</div>
          <div className="text-sm text-gray-500">Ideas</div>
        </div>
      </div>

      {/* Next Actions */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Next Actions ({data?.nextActions.length || 0})
        </h3>
        {data?.nextActions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            No active tasks. All clear!
          </div>
        ) : (
          <div className="space-y-2">
            {data?.nextActions.map((task) => {
              const due = formatDueDate(task.dueDate);
              return (
                <div
                  key={task.id}
                  className="bg-white rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">{task.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{task.nextAction}</p>
                    </div>
                    {due && (
                      <span className={`text-sm font-medium ${due.color}`}>
                        {due.text}
                      </span>
                    )}
                  </div>
                  {task.context && (
                    <div className="mt-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                        {task.context}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Stale Tasks */}
      {data?.staleTasks && data.staleTasks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Stale Tasks ({data.staleTasks.length})
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <p className="text-yellow-800 text-sm mb-3">
              These tasks haven't been updated in a while. Consider reviewing or archiving them.
            </p>
            <div className="space-y-2">
              {data.staleTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-lg border border-yellow-300 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                      <p className="text-xs text-gray-600 mt-1">{task.nextAction}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      Last updated: {formatDate(task.updatedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Projects Without Next Actions */}
      {data?.projectsWithoutNextAction && data.projectsWithoutNextAction.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Projects Without Next Actions ({data.projectsWithoutNextAction.length})
          </h3>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
            <p className="text-orange-800 text-sm mb-3">
              These projects need a next action defined to keep moving forward.
            </p>
            <div className="space-y-2">
              {data.projectsWithoutNextAction.map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-lg border border-orange-300 p-3"
                >
                  <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                  {project.desiredOutcome && (
                    <p className="text-xs text-gray-600 mt-1">{project.desiredOutcome}</p>
                  )}
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      project.status === "active"
                        ? "bg-green-100 text-green-700"
                        : project.status === "on_hold"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}>
                      {project.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Clarifications */}
      {data?.pendingClarifications && data.pendingClarifications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Needs Your Input ({data.pendingClarifications.length})
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-purple-800">
              You have {data.pendingClarifications.length} item{data.pendingClarifications.length > 1 ? 's' : ''} waiting for clarification.
            </p>
            <a
              href="/clarifications"
              className="text-purple-600 hover:text-purple-800 text-sm font-medium mt-2 inline-block"
            >
              Review now &rarr;
            </a>
          </div>
        </div>
      )}

      {/* Flagged Receipts */}
      {data?.flaggedItems && data.flaggedItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Flagged for Review ({data.flaggedItems.length})
          </h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            <p className="text-red-800 text-sm mb-3">
              These items were processed with medium confidence and may need review.
            </p>
            <div className="space-y-2">
              {data.flaggedItems.map((receipt) => (
                <div
                  key={receipt.id}
                  className="bg-white rounded-lg border border-red-300 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded ${
                          receipt.classification === "task"
                            ? "bg-blue-100 text-blue-700"
                            : receipt.classification === "project"
                            ? "bg-green-100 text-green-700"
                            : receipt.classification === "idea"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-700"
                        }`}>
                          {receipt.classification}
                        </span>
                        <span className="text-xs text-gray-500">
                          Confidence: {(receipt.confidenceScore * 100).toFixed(0)}%
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">
                        {formatDate(receipt.timestamp)}
                      </p>
                    </div>
                  </div>
                  {receipt.writes.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Created: {receipt.writes.map(w => `${w.entityType} ${w.entityId.slice(0, 8)}`).join(", ")}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <a
              href="/receipts"
              className="text-red-600 hover:text-red-800 text-sm font-medium inline-block"
            >
              View all receipts &rarr;
            </a>
          </div>
        </div>
      )}

      {/* New Contexts */}
      {data?.newContexts && data.newContexts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            New Contexts ({data.newContexts.length})
          </h3>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
            <p className="text-blue-800 text-sm mb-3">
              New contexts learned in the last 24 hours that need descriptions.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {data.newContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="bg-white rounded-lg border border-blue-300 p-3"
                >
                  <h4 className="font-medium text-gray-900 text-sm">{ctx.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-blue-100 rounded text-blue-700">
                      {ctx.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {ctx.mentionCount} {ctx.mentionCount === 1 ? 'mention' : 'mentions'}
                    </span>
                  </div>
                  {ctx.domain && (
                    <p className="text-xs text-gray-600 mt-1">{ctx.domain}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
