import { useState } from "react";
import { inbox, type ApiError } from "../lib/api";

export function Capture() {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      await inbox.capture(text.trim());
      setText("");
      setSuccess(true);
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to capture. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd+Enter or Ctrl+Enter
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Capture</h2>
        <p className="text-slate-600 leading-relaxed">
          Quick capture for thoughts, tasks, and ideas. Just dump it here.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-150">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-40 p-0 border-0 focus:ring-0 focus:outline-none resize-none text-base leading-relaxed placeholder:text-slate-400 text-slate-900"
            placeholder="What's on your mind?"
            disabled={isSubmitting}
            autoFocus
          />

          {error && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm animate-slide-up">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2 animate-scale-in">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Captured! Your thought is safe in the inbox.</span>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Press <kbd className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">⌘</kbd>
              <kbd className="ml-1 px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">↵</kbd> to submit
            </span>
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm hover:shadow disabled:shadow-none"
            >
              {isSubmitting ? "Capturing..." : "Capture"}
            </button>
          </div>
        </div>
      </form>

      <details className="text-sm text-slate-600 group">
        <summary className="font-medium text-slate-700 cursor-pointer hover:text-slate-900 transition-colors list-none flex items-center gap-2">
          <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Tips for effective capture
        </summary>
        <ul className="mt-3 space-y-2 text-slate-500 pl-6 list-disc marker:text-slate-300">
          <li>Don't worry about formatting or categorizing</li>
          <li>Include context if it helps (who, when, why)</li>
          <li>One thought per capture works best</li>
          <li>The system will figure out what to do with it</li>
        </ul>
      </details>
    </div>
  );
}
