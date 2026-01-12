import { useState, useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { inbox, extractErrorMessage } from "../lib/api";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import { useOfflineQueue } from "../hooks/useOfflineQueue";

export function Capture() {
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [clarificationCreated, setClarificationCreated] = useState(false);
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
  } = useVoiceCapture({ continuous: false, interimResults: true });

  const { queueCount, isOnline, addToQueue, syncQueue } = useOfflineQueue();
  const wasOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (transcript) {
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  // Sync offline queue when transitioning from offline to online
  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      syncQueue(async (text) => {
        await inbox.capture(text);
      }).catch(console.error);
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, syncQueue]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(false);
    setClarificationCreated(false);

    try {
      const queued = !isOnline;
      if (isOnline) {
        const response = await inbox.capture(text.trim());
        setClarificationCreated(!!response.result?.clarification);
      } else {
        await addToQueue(text.trim());
      }
      setText("");
      setWasQueued(queued);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 md:py-12 animate-fade-in">
      <header className="mb-8 md:mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-2 md:mb-3">Capture</h2>
        <p className="text-gray-500 text-lg">
          Quickly dump thoughts, tasks, and ideas into your second brain.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="relative">
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-card border border-gray-100 overflow-hidden transition-all duration-500 focus-within:shadow-card-hover focus-within:ring-1 focus-within:ring-gray-200">
          <div className="p-4 md:p-8">
            <textarea
              value={text + (interimTranscript ? ` ${interimTranscript}` : "")}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full h-40 md:h-56 p-0 border-0 focus:ring-0 focus:outline-none resize-none text-lg md:text-xl leading-relaxed placeholder:text-gray-200 text-gray-900 font-medium"
              placeholder="What's on your mind?"
              disabled={isSubmitting || isListening}
              autoFocus
            />
          </div>

          <div className="px-4 md:px-8 py-4 md:py-6 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 md:gap-6 flex-wrap">
              <div className="hidden md:flex items-center gap-2 text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
                <div className="flex gap-1">
                  <kbd className="px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-400 shadow-sm font-sans">CMD</kbd>
                  <kbd className="px-2 py-1 bg-white border border-gray-200 rounded-md text-gray-400 shadow-sm font-sans">ENTER</kbd>
                </div>
                <span>to submit</span>
              </div>

              {(!isOnline || queueCount > 0) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-amber-400" : "bg-amber-500 animate-pulse"}`} />
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">
                    {!isOnline ? "Offline" : ""}{!isOnline && queueCount > 0 ? " · " : ""}{queueCount > 0 ? `${queueCount} queued` : ""}
                  </span>
                </div>
              )}

              {isSupported && (
                <button
                  type="button"
                  onClick={() => isListening ? stopListening() : startListening()}
                  className={`p-2.5 md:p-3 rounded-full transition-all duration-300 ${
                    isListening
                      ? "bg-rose-500 text-white shadow-glow animate-pulse"
                      : "bg-white text-gray-400 hover:text-gray-600 border border-gray-200 shadow-sm"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={!text.trim() || isSubmitting}
              className="px-5 md:px-8 py-2.5 md:py-3 bg-primary text-white rounded-full font-bold text-sm shadow-premium hover:bg-primary-hover hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-10 disabled:grayscale disabled:pointer-events-none tracking-wide flex-shrink-0"
            >
              {isSubmitting ? "Capturing..." : "Capture"}
            </button>
          </div>
        </div>

        {/* Status Messages */}
        <div className="absolute -bottom-16 left-0 right-0">
          {(error || voiceError) && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-semibold animate-slide-up flex items-center gap-3">
               <span className="w-2 h-2 bg-rose-500 rounded-full" />
               {error || voiceError}
            </div>
          )}

          {success && (
            <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl text-white text-sm font-semibold animate-scale-in flex items-center gap-3 shadow-card">
               <span className={`w-2 h-2 rounded-full animate-pulse ${wasQueued ? "bg-amber-400" : clarificationCreated ? "bg-blue-400" : "bg-emerald-400"}`} />
               {wasQueued ? (
                 "Queued for sync — will upload when online"
               ) : clarificationCreated ? (
                 <span>
                   Captured! We have a question about this item.{" "}
                   <Link to="/clarifications" className="underline hover:text-blue-300">
                     View clarification
                   </Link>
                 </span>
               ) : (
                 "Successfully captured to inbox"
               )}
            </div>
          )}
        </div>
      </form>

      <section className="mt-20 md:mt-32 pt-8 md:pt-12 border-t border-gray-100">
        <h3 className="text-xs font-bold text-gray-300 uppercase tracking-[0.3em] mb-6 md:mb-8">Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: "Stream of Consciousness", desc: "Don't edit yourself. Just get the words out. We'll handle the formatting later.", icon: "✍️" },
            { title: "Atomic Thoughts", desc: "One idea per capture works best for our processing engine to categorize correctly.", icon: "🎯" }
          ].map(tip => (
            <div key={tip.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-card transition-all duration-300 group">
              <div className="text-2xl mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{tip.icon}</div>
              <h4 className="text-base font-bold text-gray-900 mb-1">{tip.title}</h4>
              <p className="text-sm text-gray-500 leading-relaxed">{tip.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
