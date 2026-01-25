import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import type { Task } from "../lib/api";

// Convert ISO date string to yyyy-MM-dd format for HTML date input
function formatDateForInput(date: string | null | undefined): string {
  if (!date) return "";
  // Handle ISO format: "2024-09-20T00:00:00.000Z" -> "2024-09-20"
  return date.split("T")[0];
}

export function TaskEditForm({
  task,
  onSave,
  onInterpret,
  onFix,
  onDelete,
  onCancel,
  saving,
}: {
  task: Task;
  onSave: (data: Partial<Task>) => void;
  onInterpret: (instruction: string) => void;
  onFix?: (correction: string) => void;
  onDelete: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [instruction, setInstruction] = useState("");
  const [correction, setCorrection] = useState("");
  const [showAllFields, setShowAllFields] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [nextAction, setNextAction] = useState(task.nextAction);
  const [dueDate, setDueDate] = useState(formatDateForInput(task.dueDate));
  const [context, setContext] = useState(task.context || "");
  const [status, setStatus] = useState(task.status);

  // Reset form when task changes
  useEffect(() => {
    setTitle(task.title);
    setNextAction(task.nextAction);
    setDueDate(formatDateForInput(task.dueDate));
    setContext(task.context || "");
    setStatus(task.status);
    setInstruction("");
    setCorrection("");
  }, [task]);

  const handleQuickStatus = (newStatus: Task["status"]) => {
    onSave({ status: newStatus });
  };

  const handleInterpret = (e: FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onInterpret(instruction.trim());
      setInstruction("");
    }
  };

  const handleFix = (e: FormEvent) => {
    e.preventDefault();
    if (correction.trim() && onFix) {
      onFix(correction.trim());
      setCorrection("");
    }
  };

  const handleManualSave = (e: FormEvent) => {
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
        <label className="block text-sm font-medium text-slate-400 mb-2">Quick Status</label>
        <div className="flex gap-2">
          {(["completed", "waiting", "someday"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleQuickStatus(s)}
              disabled={saving || task.status === s}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                task.status === s
                  ? "bg-slate-700/50 text-slate-400 cursor-not-allowed"
                  : s === "completed"
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 hover:shadow-sm"
                  : s === "waiting"
                  ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 hover:shadow-sm"
                  : "bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 hover:shadow-sm"
              }`}
            >
              {s === "completed" ? "Complete" : s === "waiting" ? "Waiting" : "Someday"}
            </button>
          ))}
        </div>
      </div>

      {/* Natural Language Edit */}
      <form onSubmit={handleInterpret}>
        <label className="block text-sm font-medium text-slate-400 mb-2">Quick Edit</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="e.g., Move to September, change context to @phone"
            className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-150 text-sm text-white placeholder:text-slate-500"
            disabled={saving}
          />
          <button
            type="submit"
            disabled={saving || !instruction.trim()}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 shadow-sm hover:shadow disabled:shadow-none"
          >
            {saving ? "..." : "Update"}
          </button>
        </div>
      </form>

      {/* Fix/Correction (may change entity type) - only show if onFix is provided */}
      {onFix && (
        <form onSubmit={handleFix} className="border-t border-slate-700/50 pt-5">
          <label className="block text-sm font-medium text-orange-600 mb-2">
            Fix (can change entity type)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={correction}
              onChange={(e) => setCorrection(e.target.value)}
              placeholder="e.g., This is actually a project, not a task"
              className="flex-1 px-4 py-2.5 bg-slate-800 border border-orange-500/50 rounded-lg focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 text-sm text-white placeholder:text-slate-500"
              disabled={saving}
            />
            <button
              type="submit"
              disabled={saving || !correction.trim()}
              className="px-5 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 text-sm font-medium transition-all duration-150"
            >
              {saving ? "..." : "Fix"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Use this to make corrections that might change the entity type
          </p>
        </form>
      )}

      {/* Delete - Moved above "Show all fields" for better visibility */}
      <div className="border-t border-slate-700/50 pt-5">
        <button
          type="button"
          onClick={onDelete}
          className="w-full px-5 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 shadow-sm hover:shadow disabled:shadow-none"
          disabled={saving}
        >
          Delete Task
        </button>
      </div>

      {/* Collapsible Manual Fields */}
      <div className="border-t border-slate-700/50 pt-5">
        <button
          type="button"
          onClick={() => setShowAllFields(!showAllFields)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white font-medium transition-colors group"
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
              <label htmlFor="task-title" className="block text-sm font-medium text-slate-400 mb-1.5">Title</label>
              <input
                id="task-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-150 text-sm text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <label htmlFor="task-next-action" className="block text-sm font-medium text-slate-400 mb-1.5">Next Action</label>
              <input
                id="task-next-action"
                type="text"
                value={nextAction}
                onChange={(e) => setNextAction(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-150 text-sm text-white placeholder:text-slate-500"
                required
              />
            </div>

            <div>
              <label htmlFor="task-due-date" className="block text-sm font-medium text-slate-400 mb-1.5">Due Date</label>
              <input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-150 text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="task-context" className="block text-sm font-medium text-slate-400 mb-1.5">Context</label>
              <input
                id="task-context"
                type="text"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="e.g., @home, @work, @phone"
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-150 text-sm text-white placeholder:text-slate-500"
              />
            </div>

            <div>
              <label htmlFor="task-status" className="block text-sm font-medium text-slate-400 mb-1.5">Status</label>
              <select
                id="task-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Task["status"])}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all duration-150 text-sm text-white"
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
              className="w-full px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all duration-150 shadow-sm hover:shadow disabled:shadow-none"
            >
              {saving ? "Saving..." : "Save All Changes"}
            </button>
          </form>
        )}
      </div>

      {/* Cancel */}
      <div className="pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-full px-5 py-2.5 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-800 active:bg-slate-700 text-sm font-medium transition-all duration-150"
          disabled={saving}
        >
          Close
        </button>
      </div>
    </div>
  );
}
