import { useState, useEffect } from "react";
import { inbox, type ApiError } from "../lib/api";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import { useOfflineQueue } from "../hooks/useOfflineQueue";

export function Capture() {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error: voiceError,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceCapture({
    continuous: false,
    interimResults: true,
  });

  const { queueCount, isOnline, addToQueue, syncQueue } = useOfflineQueue();

  // Update text when transcript changes
  useEffect(() => {
    if (transcript) {
      setText((prev) => {
        const newText = prev ? `${prev} ${transcript}` : transcript;
        return newText;
      });
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Auto-sync queue when coming back online
  useEffect(() => {
    if (isOnline && queueCount > 0) {
      syncQueue(async (queuedText) => {
        await inbox.capture(queuedText);
      }).catch(console.error);
    }
  }, [isOnline, queueCount, syncQueue]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      if (isOnline) {
        // Try to capture directly
        await inbox.capture(text.trim());
        setText("");
        setSuccess(true);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        // Queue for later when offline
        await addToQueue(text.trim());
        setText("");
        setSuccess(true);
        // Auto-hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      // If online request fails, try to queue it
      if (isOnline) {
        try {
          await addToQueue(text.trim());
          setText("");
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch (queueErr) {
          const apiError = err as ApiError;
          setError(apiError.message || apiError.error || "Failed to capture. Please try again.");
        }
      } else {
        const apiError = err as ApiError;
        setError(apiError.message || apiError.error || "Failed to queue capture.");
      }
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

  const handleVoiceToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
          <div className="relative">
            <textarea
              value={text + (interimTranscript ? ` ${interimTranscript}` : "")}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-40 p-0 border-0 focus:ring-0 focus:outline-none resize-none text-base leading-relaxed placeholder:text-slate-400 text-slate-900"
              placeholder="What's on your mind?"
              disabled={isSubmitting || isListening}
              autoFocus
            />
            {isListening && (
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse delay-75"></span>
                  <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse delay-150"></span>
                </div>
                <span className="text-xs text-rose-600 font-medium">Listening...</span>
              </div>
            )}
          </div>

          {(error || voiceError) && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm animate-slide-up">
              {error || voiceError}
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

          {!isSupported && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm animate-slide-up">
              Voice capture is not supported in this browser. Try Chrome, Edge, or Safari.
            </div>
          )}

          {!isOnline && (
            <div className="mt-4 p-4 bg-sky-50 border border-sky-200 rounded-lg text-sky-700 text-sm flex items-center justify-between animate-slide-up">
              <span>Offline mode - captures will be synced when back online</span>
              {queueCount > 0 && (
                <span className="px-2 py-1 bg-sky-100 rounded text-xs font-medium">
                  {queueCount} queued
                </span>
              )}
            </div>
          )}

          {isOnline && queueCount > 0 && (
            <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm animate-slide-up">
              Syncing {queueCount} queued capture{queueCount > 1 ? "s" : ""}...
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500">
                Press <kbd className="px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">⌘</kbd>
                <kbd className="ml-1 px-2 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700 font-medium">↵</kbd> to submit
              </span>
              {isSupported && (
                <button
                  type="button"
                  onClick={handleVoiceToggle}
                  disabled={isSubmitting}
                  className={`p-2 rounded-lg transition-colors shadow-sm ${
                    isListening
                      ? "bg-rose-500 hover:bg-rose-600 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isListening ? "Stop recording" : "Start voice capture"}
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              )}
            </div>
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
