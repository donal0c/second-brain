import { useState, useEffect } from "react";
import {
  digest,
  tasks,
  extractErrorMessage,
  type DigestResponse,
  type Task,
} from "../lib/api";
import { formatDueDate } from "../lib/dateUtils";
import { Nudges } from "../components/Nudges";
import { LoadingSkeletonLarge } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { TaskEditForm } from "../components/TaskEditForm";

export function Digest() {
  const [data, setData] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadDigest = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await digest.daily(undefined, signal);
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
    loadDigest(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSave = async (taskData: Partial<Task>) => {
    if (!editingTask) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await tasks.update(editingTask.id, taskData);
      // Update the task in our local state (could be in nextActions or staleTasks)
      // If task is no longer active, remove it from the lists
      if (data) {
        const isActive = updated.status === "active";
        const wasInNextActions = data.nextActions.some((t) => t.id === updated.id);
        const wasInStaleTasks = data.staleTasks.some((t) => t.id === updated.id);
        const wasInLists = wasInNextActions || wasInStaleTasks;

        setData({
          ...data,
          nextActions: isActive
            ? data.nextActions.map((t) => (t.id === updated.id ? updated : t))
            : data.nextActions.filter((t) => t.id !== updated.id),
          staleTasks: isActive
            ? data.staleTasks.map((t) => (t.id === updated.id ? updated : t))
            : data.staleTasks.filter((t) => t.id !== updated.id),
          stats: {
            ...data.stats,
            activeTasks:
              !isActive && wasInLists
                ? data.stats.activeTasks - 1
                : data.stats.activeTasks,
          },
        });
      }
      setEditingTask(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleInterpret = async (instruction: string) => {
    if (!editingTask) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await tasks.interpret(editingTask.id, instruction);
      // If task is no longer active, remove it from the lists
      if (data) {
        const updated = result.entity;
        const isActive = updated.status === "active";
        const wasInNextActions = data.nextActions.some((t) => t.id === updated.id);
        const wasInStaleTasks = data.staleTasks.some((t) => t.id === updated.id);
        const wasInLists = wasInNextActions || wasInStaleTasks;

        setData({
          ...data,
          nextActions: isActive
            ? data.nextActions.map((t) => (t.id === updated.id ? updated : t))
            : data.nextActions.filter((t) => t.id !== updated.id),
          staleTasks: isActive
            ? data.staleTasks.map((t) => (t.id === updated.id ? updated : t))
            : data.staleTasks.filter((t) => t.id !== updated.id),
          stats: {
            ...data.stats,
            activeTasks:
              !isActive && wasInLists
                ? data.stats.activeTasks - 1
                : data.stats.activeTasks,
          },
        });
      }
      setEditingTask(result.entity);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTask) return;

    if (!window.confirm(`Are you sure you want to delete "${editingTask.title}"?`)) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await tasks.delete(editingTask.id);
      if (data) {
        setData({
          ...data,
          nextActions: data.nextActions.filter((t) => t.id !== editingTask.id),
          staleTasks: data.staleTasks.filter((t) => t.id !== editingTask.id),
        });
      }
      setEditingTask(null);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div className="p-6 md:p-8 min-h-full space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-white font-display">Digest</h2>
        <LoadingSkeletonLarge />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 min-h-full space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-white font-display">Digest</h2>
        <ErrorBanner error={error} onRetry={() => loadDigest()} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-full space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white font-display mb-2">Digest</h2>
          <p className="text-slate-400 text-lg">{data?.date}</p>
        </div>
        <button
          onClick={() => loadDigest()}
          className="px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-150"
          data-testid="refresh-button"
        >
          Refresh
        </button>
      </div>

      {/* Nudges Section */}
      <Nudges />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4" data-testid="stats-grid">
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-150" data-testid="stat-active-tasks">
          <div className="text-3xl font-bold text-indigo-400 mb-1" data-testid="stat-active-tasks-value">{data?.stats.activeTasks}</div>
          <div className="text-sm text-slate-400 font-medium" data-testid="stat-active-tasks-label">Active Tasks</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-150" data-testid="stat-active-projects">
          <div className="text-3xl font-bold text-purple-400 mb-1" data-testid="stat-active-projects-value">{data?.stats.activeProjects}</div>
          <div className="text-sm text-slate-400 font-medium" data-testid="stat-active-projects-label">Active Projects</div>
        </div>
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-indigo-500/30 hover:shadow-indigo-500/10 transition-all duration-150" data-testid="stat-ideas">
          <div className="text-3xl font-bold text-purple-400 mb-1" data-testid="stat-ideas-value">{data?.stats.ideas}</div>
          <div className="text-sm text-slate-400 font-medium" data-testid="stat-ideas-label">Ideas</div>
        </div>
      </div>

      {/* Next Actions */}
      <div>
        <h3 className="text-xl font-semibold text-white mb-4">Next Actions</h3>
        {data?.nextActions.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center shadow-sm" data-testid="empty-next-actions">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400 text-lg">No active tasks</p>
            <p className="text-slate-400 text-sm mt-1">Time to capture some thoughts!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.nextActions.map((task) => {
              const due = formatDueDate(task.dueDate);
              return (
                <div
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 cursor-pointer hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 hover:-translate-y-0.5 transition-all duration-150 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white leading-tight">{task.title}</h4>
                      <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{task.nextAction}</p>
                    </div>
                    {due && (
                      <span className={`text-sm font-medium whitespace-nowrap ${due.color}`}>
                        {due.text}
                      </span>
                    )}
                  </div>
                  {task.context && (
                    <div className="mt-3">
                      <span className="text-xs px-2.5 py-1 bg-slate-700/50 rounded-full text-slate-400 font-medium">
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

      {/* Flagged Items */}
      {data?.flaggedItems && data.flaggedItems.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Flagged for Review
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({data.flaggedItems.length})
            </span>
          </h3>
          <div className="space-y-3">
            {data.flaggedItems.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2.5 py-1 bg-rose-500/20 rounded-full text-rose-400 font-medium capitalize">
                        {receipt.classification}
                      </span>
                      {receipt.confidenceScore < 0.7 && (
                        <span className="text-xs px-2.5 py-1 bg-orange-500/20 rounded-full text-orange-400 font-medium">
                          Low confidence ({Math.round(receipt.confidenceScore * 100)}%)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400">
                      {receipt.extractedFields?.title as string || receipt.extractedFields?.content as string || 'Review required'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(receipt.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stale Tasks */}
      {data?.staleTasks && data.staleTasks.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Stale Tasks
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({data.staleTasks.length})
            </span>
          </h3>
          <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-5 shadow-sm">
            <p className="text-slate-400 mb-4 text-sm">
              These tasks haven't been updated recently. Consider reviewing or completing them.
            </p>
            <div className="space-y-3">
              {data.staleTasks.map((task) => {
                const due = formatDueDate(task.dueDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 cursor-pointer hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/10 transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white leading-tight">{task.title}</h4>
                        {task.nextAction && (
                          <p className="text-sm text-slate-400 mt-1">{task.nextAction}</p>
                        )}
                      </div>
                      {due && (
                        <span className={`text-sm font-medium whitespace-nowrap ${due.color}`}>
                          {due.text}
                        </span>
                      )}
                    </div>
                    {task.context && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-1 bg-slate-700/50 rounded-full text-slate-400 font-medium">
                          {task.context}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Projects Without Next Action */}
      {data?.projectsWithoutNextAction && data.projectsWithoutNextAction.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Projects Needing Next Action
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({data.projectsWithoutNextAction.length})
            </span>
          </h3>
          <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-5 shadow-sm">
            <p className="text-indigo-400 mb-4 text-sm">
              These active projects don't have a next action defined.
            </p>
            <div className="space-y-3">
              {data.projectsWithoutNextAction.map((project) => (
                <a
                  key={project.id}
                  href={`/browse?type=project&id=${project.id}`}
                  className="block bg-slate-800/50 rounded-lg border border-indigo-500/20 p-4 hover:border-indigo-500/40 hover:shadow-sm transition-all duration-150"
                >
                  <h4 className="font-medium text-white">{project.name}</h4>
                  {project.desiredOutcome && (
                    <p className="text-sm text-slate-400 mt-1">{project.desiredOutcome}</p>
                  )}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* New Contexts */}
      {data?.newContexts && data.newContexts.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            New Contexts Discovered
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({data.newContexts.length})
            </span>
          </h3>
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-5 shadow-sm">
            <p className="text-purple-400 mb-4 text-sm">
              These contexts were recently learned and may need descriptions.
            </p>
            <div className="flex flex-wrap gap-2">
              {data.newContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg border border-purple-500/20"
                >
                  <span className="font-medium text-white">{ctx.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-purple-500/20 rounded text-purple-400 capitalize">
                    {ctx.type}
                  </span>
                  {ctx.domain && (
                    <span className="text-xs text-slate-400">({ctx.domain})</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Pending Clarifications */}
      {data?.pendingClarifications && data.pendingClarifications.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold text-white mb-4">
            Needs Your Input
          </h3>
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 shadow-sm">
            <p className="text-amber-400 font-medium">
              {data.pendingClarifications.length} item{data.pendingClarifications.length > 1 ? 's' : ''} waiting for clarification
            </p>
            <a
              href="/clarifications"
              className="text-amber-400 hover:text-amber-300 text-sm font-semibold mt-3 inline-flex items-center gap-1 group"
            >
              Review now
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => {
          setEditingTask(null);
          setSaveError(null);
        }}
        title="Edit Task"
      >
        {saveError && (
          <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 text-sm animate-slide-up">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm flex items-center gap-2 animate-scale-in">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Saved successfully!</span>
          </div>
        )}

        {editingTask && (
          <TaskEditForm
            task={editingTask}
            onSave={handleSave}
            onInterpret={handleInterpret}
            onDelete={handleDelete}
            onCancel={() => setEditingTask(null)}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  );
}
