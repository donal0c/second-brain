import { useState, useEffect } from "react";
import {
  digest,
  tasks,
  type DigestResponse,
  type Task,
  type ApiError,
} from "../lib/api";
import { formatDueDate } from "../lib/dateUtils";
import { LoadingSkeletonLarge } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { TaskEditForm } from "../components/TaskEditForm";

export function Today() {
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
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Today</h2>
        <LoadingSkeletonLarge />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Today</h2>
        <ErrorBanner error={error} onRetry={() => loadDigest()} />
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
          onClick={() => loadDigest()}
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
                  onClick={() => setEditingTask(task)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
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

      {/* Flagged Items */}
      {data?.flaggedItems && data.flaggedItems.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Flagged for Review ({data.flaggedItems.length})
          </h3>
          <div className="space-y-2">
            {data.flaggedItems.map((receipt) => (
              <div
                key={receipt.id}
                className="bg-rose-50 border border-rose-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-2 py-0.5 bg-rose-100 rounded text-rose-700 capitalize">
                        {receipt.classification}
                      </span>
                      {receipt.confidenceScore < 0.7 && (
                        <span className="text-xs px-2 py-0.5 bg-orange-100 rounded text-orange-700">
                          Low confidence ({Math.round(receipt.confidenceScore * 100)}%)
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">
                      {receipt.extractedFields?.title as string || receipt.extractedFields?.content as string || 'Review required'}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Stale Tasks ({data.staleTasks.length})
          </h3>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-600 text-sm mb-3">
              These tasks haven't been updated recently.
            </p>
            <div className="space-y-2">
              {data.staleTasks.map((task) => {
                const due = formatDueDate(task.dueDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{task.title}</h4>
                        {task.nextAction && (
                          <p className="text-xs text-gray-600 mt-1">{task.nextAction}</p>
                        )}
                      </div>
                      {due && (
                        <span className={`text-xs font-medium ${due.color}`}>
                          {due.text}
                        </span>
                      )}
                    </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Projects Needing Next Action ({data.projectsWithoutNextAction.length})
          </h3>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <p className="text-indigo-700 text-sm mb-3">
              These projects don't have a next action defined.
            </p>
            <div className="space-y-2">
              {data.projectsWithoutNextAction.map((project) => (
                <a
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block bg-white rounded-lg border border-indigo-100 p-3 hover:border-indigo-300 transition-all"
                >
                  <h4 className="font-medium text-gray-900 text-sm">{project.name}</h4>
                  {project.desiredOutcome && (
                    <p className="text-xs text-gray-600 mt-1">{project.desiredOutcome}</p>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            New Contexts ({data.newContexts.length})
          </h3>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-purple-700 text-sm mb-3">
              Recently learned contexts that may need descriptions.
            </p>
            <div className="flex flex-wrap gap-2">
              {data.newContexts.map((ctx) => (
                <div
                  key={ctx.id}
                  className="inline-flex items-center gap-1.5 px-2 py-1 bg-white rounded border border-purple-100 text-sm"
                >
                  <span className="font-medium text-gray-900">{ctx.name}</span>
                  <span className="text-xs px-1.5 py-0.5 bg-purple-100 rounded text-purple-700 capitalize">
                    {ctx.type}
                  </span>
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
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {saveError}
          </div>
        )}

        {saveSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">
            Saved successfully!
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
