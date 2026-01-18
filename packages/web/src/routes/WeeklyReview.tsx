import { useState, useEffect } from "react";
import {
  digest,
  extractErrorMessage,
  type WeeklyReviewResponse,
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
      setError(extractErrorMessage(err));
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
      <div className="p-6 md:p-8 min-h-full">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white font-display">Weekly Review</h2>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-slate-800/50 rounded-lg"></div>
            <div className="h-48 bg-slate-800/50 rounded-lg"></div>
            <div className="h-48 bg-slate-800/50 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 min-h-full">
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white font-display">Weekly Review</h2>
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
            {error}
            <button onClick={() => loadWeeklyReview()} className="ml-2 underline hover:no-underline">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-full">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white font-display">Weekly Review</h2>
            <p className="text-slate-400 mt-1">
              {data?.weekStart} to {data?.weekEnd}
            </p>
          </div>
          <button
            onClick={() => loadWeeklyReview()}
            className="px-3 py-1 text-sm text-slate-400 hover:text-white"
            data-testid="refresh-button"
          >
            Refresh
          </button>
        </div>

        {/* Wins / Completed Items */}
        {data && (data.wins.totalTasks > 0 || data.wins.totalProjects > 0) && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-400 mb-3">
              Wins This Week ({data.wins.totalTasks + data.wins.totalProjects})
            </h3>
            {data.wins.completedTasks.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-green-400 mb-2">
                  Completed Tasks ({data.wins.totalTasks})
                </h4>
                <div className="space-y-1">
                  {data.wins.completedTasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="text-sm text-green-400">
                      ✓ {task.title}
                    </div>
                  ))}
                  {data.wins.totalTasks > 10 && (
                    <div className="text-sm text-green-400 italic">
                      ...and {data.wins.totalTasks - 10} more tasks
                    </div>
                  )}
                </div>
              </div>
            )}
            {data.wins.completedProjects.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2">
                  Completed Projects ({data.wins.totalProjects})
                </h4>
                <div className="space-y-1">
                  {data.wins.completedProjects.map((project) => (
                    <div key={project.id} className="text-sm text-green-400">
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
            <h3 className="text-lg font-semibold text-white mb-3">
              Open Loops ({data.openLoops.total})
            </h3>
            <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
              <p className="text-sm text-slate-400 mb-3">
                You have {data.openLoops.total} active tasks in your system.
              </p>
              {data.openLoops.total > 20 && (
                <div className="text-sm text-orange-400">
                  Consider reviewing your active tasks - you might have too many open loops.
                </div>
              )}
              {data.openLoops.tasks.slice(0, 5).map((task) => (
                <div key={task.id} className="text-sm text-slate-400 py-1">
                  • {task.title}
                </div>
              ))}
              {data.openLoops.total > 5 && (
                <a href="/browse" className="text-sm text-indigo-400 hover:text-indigo-300 mt-2 inline-block">
                  View all tasks →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stale Projects */}
        {data && data.staleProjects.total > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">
              Stale Projects ({data.staleProjects.total})
            </h3>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-sm text-yellow-400 mb-3">
                These projects haven't been updated in 14+ days. Consider reviewing them.
              </p>
              <div className="space-y-2">
                {data.staleProjects.projects.map((project) => (
                  <div key={project.id} className="bg-slate-900/50 rounded border border-yellow-500/50 p-3">
                    <h4 className="font-medium text-white">{project.name}</h4>
                    {project.desiredOutcome && (
                      <p className="text-sm text-slate-400 mt-1">{project.desiredOutcome}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-2">
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
            <h3 className="text-lg font-semibold text-white mb-3">
              Personal Context Questions ({data.contextQuestions.total})
            </h3>
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
              <p className="text-sm text-indigo-400 mb-3">
                These people/places have been mentioned multiple times without descriptions.
              </p>
              <div className="space-y-2">
                {data.contextQuestions.questions.map((question) => (
                  <div key={question.contextId} className="bg-slate-900/50 rounded border border-indigo-500/50 p-3">
                    <p className="text-sm font-medium text-white">{question.suggestedQuestion}</p>
                    <p className="text-xs text-slate-400 mt-1">
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
            <h3 className="text-lg font-semibold text-white mb-3">
              Suggested Areas of Focus
            </h3>
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
              <div className="space-y-2">
                {data.suggestedFocus.map((focus, index) => (
                  <div key={index} className="bg-slate-900/50 rounded border border-purple-500/50 p-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">
                        {focus.context}
                      </h4>
                      <span className="text-sm text-slate-400">{focus.taskCount} tasks</span>
                    </div>
                    <p className="text-sm text-slate-400 mt-1">{focus.suggestion}</p>
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
          <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-8 text-center">
            <p className="text-slate-400">
              Your weekly review is empty. Start capturing thoughts and building your second brain!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
