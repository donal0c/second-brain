import { useState, useEffect } from "react";
import { digest, type DigestResponse, type ApiError } from "../lib/api";

export function Today() {
  const [data, setData] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDigest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await digest.daily();
      setData(response);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to load digest");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDigest();
  }, []);

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

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Today</h2>
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
        <h2 className="text-2xl font-bold text-gray-900">Today</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={loadDigest} className="ml-2 underline hover:no-underline">
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
          <h2 className="text-2xl font-bold text-gray-900">Today</h2>
          <p className="text-gray-600 mt-1">{data?.date}</p>
        </div>
        <button
          onClick={loadDigest}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Next Actions</h3>
        {data?.nextActions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6 text-center text-gray-500">
            No active tasks. Time to capture some thoughts!
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

      {/* Pending Clarifications */}
      {data?.pendingClarifications && data.pendingClarifications.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Needs Your Input ({data.pendingClarifications.length})
          </h3>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-orange-800">
              You have {data.pendingClarifications.length} item{data.pendingClarifications.length > 1 ? 's' : ''} waiting for clarification.
            </p>
            <a
              href="/clarifications"
              className="text-orange-600 hover:text-orange-800 text-sm font-medium mt-2 inline-block"
            >
              Review now &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
