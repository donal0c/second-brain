import { useState, useEffect } from "react";
import {
  digest,
  tasks,
  type DigestResponse,
  type Task,
  type ApiError,
} from "../lib/api";

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
      // Update the task in our local state
      if (data) {
        setData({
          ...data,
          nextActions: data.nextActions.map((t) =>
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
        <h2 className="text-2xl font-bold text-gray-900">Digest</h2>
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
        <h2 className="text-2xl font-bold text-gray-900">Digest</h2>
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
          <h2 className="text-2xl font-bold text-gray-900">Digest</h2>
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
      {editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Task</h3>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setSaveError(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

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

              <TaskEditForm
                task={editingTask}
                onSave={handleSave}
                onInterpret={handleInterpret}
                onDelete={handleDelete}
                onCancel={() => setEditingTask(null)}
                saving={saving}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Task Edit Form (same as Browse.tsx)
// =============================================================================

function TaskEditForm({
  task,
  onSave,
  onInterpret,
  onDelete,
  onCancel,
  saving,
}: {
  task: Task;
  onSave: (data: Partial<Task>) => void;
  onInterpret: (instruction: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [nextAction, setNextAction] = useState(task.nextAction);
  const [dueDate, setDueDate] = useState(task.dueDate || "");
  const [context, setContext] = useState(task.context || "");
  const [status, setStatus] = useState(task.status);

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setNextAction(task.nextAction);
    setDueDate(task.dueDate || "");
    setContext(task.context || "");
    setStatus(task.status);
    setInstruction("");
  }, [task]);

  const handleQuickStatus = (newStatus: Task["status"]) => {
    onSave({ status: newStatus });
  };

  const handleInterpret = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
      setInstruction("");
    }
  };

  const handleManualSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      nextAction,
      dueDate: dueDate || null,
      context: context || null,
      status,
    });
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Buttons */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Status</label>
        <div className="flex gap-2">
          {(["completed", "waiting", "someday"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleQuickStatus(s)}
              disabled={saving || task.status === s}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                task.status === s
                  ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                  : s === "completed"
                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                  : s === "waiting"
                  ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200"
              }`}
            >
              {s === "completed" ? "Complete" : s === "waiting" ? "Waiting" : "Someday"}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Edit */}
      <form onSubmit={handleInterpret}>
        <label className="block text-xs font-medium text-gray-500 mb-2">Quick Edit</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Move to September, change context to @phone"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !instruction.trim()}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
          >
            {saving ? "..." : "Update"}
          </button>
        </div>
      </form>

      {/* Collapsible Manual Fields */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={() => setShowAllFields(!showAllFields)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAllFields ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAllFields ? "Hide all fields" : "Show all fields"}
        </button>

        {showAllFields && (
          <form onSubmit={handleManualSave} className="mt-4 space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Action</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context</label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., @home, @work, @phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
              >
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="someday">Someday</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </form>
        )}
      </div>

      {/* Delete */}
      <div className="border-t border-gray-200 pt-4">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
          disabled={saving}
        >
          Delete Task
        </button>
      </div>

      {/* Cancel */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
          disabled={saving}
        >
          Close
        </button>
      </div>
    </div>
  );
}
