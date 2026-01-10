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
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Capture</h2>
        <p className="text-gray-600 mt-1">
          Quick capture for thoughts, tasks, and ideas. Just dump it here.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent resize-none"
            placeholder="What's on your mind?"
            disabled={isSubmitting}
            autoFocus
          />

          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Captured! Your thought is now in the inbox.
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Cmd</kbd>+
              <kbd className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">Enter</kbd> to submit
            </span>
            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Capturing..." : "Capture"}
            </button>
          </div>
        </div>
      </form>

      <div className="text-sm text-gray-500 space-y-2">
        <p className="font-medium">Tips for effective capture:</p>
        <ul className="list-disc list-inside space-y-1 text-gray-400">
          <li>Don't worry about formatting or categorizing</li>
          <li>Include context if it helps (who, when, why)</li>
          <li>One thought per capture works best</li>
          <li>The system will figure out what to do with it</li>
        </ul>
      </div>
    </div>
  );
}
