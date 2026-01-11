import { useState, useEffect } from "react";
import {
  digest,
  tasks,
  type DigestResponse,
  type Task,
  type ApiError,
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
  }, []);

  const handleSave = async (taskData: Partial<Task>) => {
    if (!editingTask) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await tasks.update(editingTask.id, taskData);
      // Update the task in our local state (could be in nextActions or staleTasks)
      if (data) {
        setData({
          ...data,
          nextActions: data.nextActions.map((t) =>
            t.id === updated.id ? updated : t
          ),
          staleTasks: data.staleTasks.map((t) =>
            t.id === updated.id ? updated : t
          ),
        });
      }
      setEditingTask(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      const apiError = err as ApiError;
      setSaveError(apiError.message || apiError.error || "Failed to save");
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
      if (data) {
        setData({
          ...data,
          nextActions: data.nextActions.map((t) =>
            t.id === result.entity.id ? result.entity : t
          ),
          staleTasks: data.staleTasks.map((t) =>
            t.id === result.entity.id ? result.entity : t
          ),
        });
      }
      setEditingTask(result.entity);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      const apiError = err as ApiError;
      setSaveError(apiError.message || apiError.error || "Failed to interpret");
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
      const apiError = err as ApiError;
      setSaveError(apiError.message || apiError.error || "Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-900">Digest</h2>
        <LoadingSkeletonLarge />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-gray-900">Digest</h2>
        <ErrorBanner error={error} onRetry={() => loadDigest()} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Digest</h2>
          <p className="text-gray-600 text-lg">{data?.date}</p>
        </div>
        <button
          onClick={() => loadDigest()}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-150"
        >
          Refresh
        </button>
      </div>

      {/* Nudges Section */}
      <Nudges />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm hover:shadow-md transition-all duration-150">
          <div className="text-3xl font-bold text-primary-hover mb-1">{data?.stats.activeTasks}</div>
          <div className="text-sm text-gray-600 font-medium">Active Tasks</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm hover:shadow-md transition-all duration-150">
          <div className="text-3xl font-bold text-indigo-600 mb-1">{data?.stats.activeProjects}</div>
          <div className="text-sm text-gray-600 font-medium">Active Projects</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm hover:shadow-md transition-all duration-150">
          <div className="text-3xl font-bold text-purple-600 mb-1">{data?.stats.ideas}</div>
          <div className="text-sm text-gray-600 font-medium">Ideas</div>
        </div>
      </div>

      {/* Next Actions */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Next Actions</h3>
        {data?.nextActions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 text-lg">No active tasks</p>
            <p className="text-gray-500 text-sm mt-1">Time to capture some thoughts!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.nextActions.map((task) => {
              const due = formatDueDate(task.dueDate);
              return (
                <div
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 leading-tight">{task.title}</h4>
                      <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{task.nextAction}</p>
                    </div>
                    {due && (
                      <span className={`text-sm font-medium whitespace-nowrap ${due.color}`}>
                        {due.text}
                      </span>
                    )}
                  </div>
                  {task.context && (
                    <div className="mt-3">
                      <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full text-gray-700 font-medium">
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Flagged for Review
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({data.flaggedItems.length})
            </span>
          </h3>
          <div className="space-y-3">
            {data.flaggedItems.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-rose-50 border border-rose-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-150"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2.5 py-1 bg-rose-100 rounded-full text-rose-700 font-medium capitalize">
                        {receipt.classification}
                      </span>
                      {receipt.confidenceScore < 0.7 && (
                        <span className="text-xs px-2.5 py-1 bg-orange-100 rounded-full text-orange-700 font-medium">
                          Low confidence ({Math.round(receipt.confidenceScore * 100)}%)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      {receipt.extractedFields?.title as string || receipt.extractedFields?.content as string || 'Review required'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Stale Tasks
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({data.staleTasks.length})
            </span>
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm">
            <p className="text-gray-700 mb-4 text-sm">
              These tasks haven't been updated recently. Consider reviewing or completing them.
            </p>
            <div className="space-y-3">
              {data.staleTasks.map((task) => {
                const due = formatDueDate(task.dueDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all duration-150"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 leading-tight">{task.title}</h4>
                        {task.nextAction && (
                          <p className="text-sm text-gray-600 mt-1">{task.nextAction}</p>
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
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 font-medium">
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Projects Needing Next Action
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({data.projectsWithoutNextAction.length})
            </span>
          </h3>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 shadow-sm">
            <p className="text-indigo-700 mb-4 text-sm">
              These active projects don't have a next action defined.
            </p>
            <div className="space-y-3">
              {data.projectsWithoutNextAction.map((project) => (
                <a
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block bg-white rounded-lg border border-indigo-100 p-4 hover:border-indigo-300 hover:shadow-sm transition-all duration-150"
                >
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  {project.desiredOutcome && (
                    <p className="text-sm text-gray-600 mt-1">{project.desiredOutcome}</p>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            New Contexts Discovered
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({data.newContexts.length})
            </span>
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5 shadow-sm">
            <p className="text-purple-700 mb-4 text-sm">
              These contexts were recently learned and may need descriptions.
            </p>
            <div className="flex flex-wrap gap-2">
              {data.newContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-purple-100"
                >
                  <span className="font-medium text-gray-900">{ctx.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-purple-100 rounded text-purple-700 capitalize">
                    {ctx.type}
                  </span>
                  {ctx.domain && (
                    <span className="text-xs text-gray-500">({ctx.domain})</span>
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Needs Your Input
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
            <p className="text-amber-900 font-medium">
              {data.pendingClarifications.length} item{data.pendingClarifications.length > 1 ? 's' : ''} waiting for clarification
            </p>
            <a
              href="/clarifications"
              className="text-amber-700 hover:text-amber-900 text-sm font-semibold mt-3 inline-flex items-center gap-1 group"
            >
              Review now
              <svg className="w-4 h-4 group-hover:trangray-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm animate-slide-up">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2 animate-scale-in">
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
