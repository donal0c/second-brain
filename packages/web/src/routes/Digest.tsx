import { useState, useEffect } from "react";
import {
  digest,
  tasks,
  type DigestResponse,
  type Task,
  type ApiError,
} from "../lib/api";
import { Nudges } from "../components/Nudges";

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
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-slate-900">Digest</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-64 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h2 className="text-3xl font-bold text-slate-900">Digest</h2>
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
          {error}
          <button onClick={() => loadDigest()} className="ml-2 underline hover:no-underline font-medium">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Digest</h2>
          <p className="text-slate-600 text-lg">{data?.date}</p>
        </div>
        <button
          onClick={() => loadDigest()}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all duration-150"
        >
          Refresh
        </button>
      </div>

      {/* Nudges Section */}
      <Nudges />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm hover:shadow-md transition-all duration-150">
          <div className="text-3xl font-bold text-blue-600 mb-1">{data?.stats.activeTasks}</div>
          <div className="text-sm text-slate-600 font-medium">Active Tasks</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm hover:shadow-md transition-all duration-150">
          <div className="text-3xl font-bold text-indigo-600 mb-1">{data?.stats.activeProjects}</div>
          <div className="text-sm text-slate-600 font-medium">Active Projects</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-center shadow-sm hover:shadow-md transition-all duration-150">
          <div className="text-3xl font-bold text-purple-600 mb-1">{data?.stats.ideas}</div>
          <div className="text-sm text-slate-600 font-medium">Ideas</div>
        </div>
      </div>

      {/* Next Actions */}
      <div>
        <h3 className="text-xl font-semibold text-slate-900 mb-4">Next Actions</h3>
        {data?.nextActions.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-600 text-lg">No active tasks</p>
            <p className="text-slate-500 text-sm mt-1">Time to capture some thoughts!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.nextActions.map((task) => {
              const due = formatDueDate(task.dueDate);
              return (
                <div
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="bg-white rounded-xl border border-slate-200 p-5 cursor-pointer hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 leading-tight">{task.title}</h4>
                      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{task.nextAction}</p>
                    </div>
                    {due && (
                      <span className={`text-sm font-medium whitespace-nowrap ${due.color}`}>
                        {due.text}
                      </span>
                    )}
                  </div>
                  {task.context && (
                    <div className="mt-3">
                      <span className="text-xs px-2.5 py-1 bg-slate-100 rounded-full text-slate-700 font-medium">
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
          <h3 className="text-xl font-semibold text-slate-900 mb-4">
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
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50 px-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900">Edit Task</h3>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setSaveError(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-lg transition-all duration-150"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

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
    <div className="space-y-5">
      {/* Quick Status Buttons */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Quick Status</label>
        <div className="flex gap-2">
          {(["completed", "waiting", "someday"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleQuickStatus(s)}
              disabled={saving || task.status === s}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                task.status === s
                  ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                  : s === "completed"
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:shadow-sm"
                  : s === "waiting"
                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200 hover:shadow-sm"
                  : "bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-sm"
              }`}
            >
              {s === "completed" ? "Complete" : s === "waiting" ? "Waiting" : "Someday"}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Edit */}
      <form onSubmit={handleInterpret}>
        <label className="block text-sm font-medium text-slate-700 mb-2">Quick Edit</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Move to September, change context to @phone"
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 text-sm placeholder:text-slate-400"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !instruction.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 shadow-sm hover:shadow disabled:shadow-none"
          >
            {saving ? "..." : "Update"}
          </button>
        </div>
      </form>

      {/* Collapsible Manual Fields */}
      <div className="border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={() => setShowAllFields(!showAllFields)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 font-medium transition-colors group"
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
          <form onSubmit={handleManualSave} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Next Action</label>
              <input
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Context</label>
              <input
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., @home, @work, @phone"
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 text-sm placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 text-sm"
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
              className="w-full px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 shadow-sm hover:shadow disabled:shadow-none"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </form>
        )}
      </div>

      {/* Delete */}
      <div className="border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 shadow-sm hover:shadow disabled:shadow-none"
          disabled={saving}
        >
          Delete Task
        </button>
      </div>

      {/* Cancel */}
      <div className="pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-full px-5 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 active:bg-slate-100 text-sm font-medium transition-all duration-150"
          disabled={saving}
        >
          Close
        </button>
      </div>
    </div>
  );
}
