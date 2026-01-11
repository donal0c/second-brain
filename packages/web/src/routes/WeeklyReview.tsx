import { useState, useEffect } from "react";
import {
  digest,
  type WeeklyReviewResponse,
  type ApiError,
} from "../lib/api";

export function WeeklyReview() {
  const [data, setData] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeeklyReview = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await digest.weekly(signal);
      setData(response);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to load weekly review");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadWeeklyReview(controller.signal);
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Weekly Review</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
          <div className="h-48 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Weekly Review</h2>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={() => loadWeeklyReview()} className="ml-2 underline hover:no-underline">
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
          <h2 className="text-2xl font-bold text-gray-900">Weekly Review</h2>
          <p className="text-gray-600 mt-1">
            {data?.weekStart} to {data?.weekEnd}
          </p>
        </div>
        <button
          onClick={() => loadWeeklyReview()}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {/* Wins / Completed Items */}
      {data && (data.wins.totalTasks > 0 || data.wins.totalProjects > 0) && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            Wins This Week ({data.wins.totalTasks + data.wins.totalProjects})
          </h3>
          {data.wins.completedTasks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Completed Tasks ({data.wins.totalTasks})
              </h4>
              <div className="space-y-1">
                {data.wins.completedTasks.slice(0, 10).map((task) => (
                  <div key={task.id} className="text-sm text-green-700">
                    ✓ {task.title}
                  </div>
                ))}
                {data.wins.totalTasks > 10 && (
                  <div className="text-sm text-green-600 italic">
                    ...and {data.wins.totalTasks - 10} more tasks
                  </div>
                )}
              </div>
            </div>
          )}
          {data.wins.completedProjects.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-2">
                Completed Projects ({data.wins.totalProjects})
              </h4>
              <div className="space-y-1">
                {data.wins.completedProjects.map((project) => (
                  <div key={project.id} className="text-sm text-green-700">
                    ✓ {project.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Open Loops */}
      {data && data.openLoops.total > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Open Loops ({data.openLoops.total})
          </h3>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-3">
              You have {data.openLoops.total} active tasks in your system.
            </p>
            {data.openLoops.total > 20 && (
              <div className="text-sm text-orange-600">
                Consider reviewing your active tasks - you might have too many open loops.
              </div>
            )}
            {data.openLoops.tasks.slice(0, 5).map((task) => (
              <div key={task.id} className="text-sm text-gray-700 py-1">
                • {task.title}
              </div>
            ))}
            {data.openLoops.total > 5 && (
              <a href="/browse" className="text-sm text-primary-hover hover:text-primary-800 mt-2 inline-block">
                View all tasks →
              </a>
            )}
          </div>
        </div>
      )}

      {/* Stale Projects */}
      {data && data.staleProjects.total > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Stale Projects ({data.staleProjects.total})
          </h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800 mb-3">
              These projects haven't been updated in 14+ days. Consider reviewing them.
            </p>
            <div className="space-y-2">
              {data.staleProjects.projects.map((project) => (
                <div key={project.id} className="bg-white rounded border border-yellow-300 p-3">
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  {project.desiredOutcome && (
                    <p className="text-sm text-gray-600 mt-1">{project.desiredOutcome}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Context Questions */}
      {data && data.contextQuestions.total > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Personal Context Questions ({data.contextQuestions.total})
          </h3>
          <div className="bg-primary-subtle border border-primary-200 rounded-lg p-4">
            <p className="text-sm text-primary-800 mb-3">
              These people/places have been mentioned multiple times without descriptions.
            </p>
            <div className="space-y-2">
              {data.contextQuestions.questions.map((question) => (
                <div key={question.contextId} className="bg-white rounded border border-primary-300 p-3">
                  <p className="text-sm font-medium text-gray-900">{question.suggestedQuestion}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mentioned {question.mentionCount} times • {question.type}
                    {question.domain && ` • ${question.domain}`}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Suggested Areas of Focus */}
      {data && data.suggestedFocus.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Suggested Areas of Focus
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="space-y-2">
              {data.suggestedFocus.map((focus, index) => (
                <div key={index} className="bg-white rounded border border-purple-300 p-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-900">
                      {focus.context}
                    </h4>
                    <span className="text-sm text-gray-500">{focus.taskCount} tasks</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{focus.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data &&
       data.wins.totalTasks === 0 &&
       data.wins.totalProjects === 0 &&
       data.openLoops.total === 0 &&
       data.staleProjects.total === 0 &&
       data.contextQuestions.total === 0 &&
       data.suggestedFocus.length === 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            Your weekly review is empty. Start capturing thoughts and building your second brain!
          </p>
        </div>
      )}
    </div>
  );
}
