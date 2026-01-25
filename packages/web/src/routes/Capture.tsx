import { useState, useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { extractErrorMessage } from "../lib/api";
import { useCapture } from "../lib/queries";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import { Spotlight } from "../components/ui/Spotlight";
import { CardContainer, CardBody, CardItem } from "../components/ui/Card3D";
import { TextShimmer } from "../components/ui/TextShimmer";
import { Confetti } from "../components/ui/Confetti";

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
  const captureMutation = useCapture();
  const wasOnlineRef = useRef(isOnline);

  useEffect(() => {
    if (transcript) {
      setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      resetTranscript();
    }
  }, [transcript, resetTranscript]);

  useEffect(() => {
    if (isOnline && !wasOnlineRef.current) {
      syncQueue(async (text) => {
        await captureMutation.mutateAsync(text);
      }).catch(console.error);
    }
    wasOnlineRef.current = isOnline;
  }, [isOnline, syncQueue, captureMutation]);

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
        const response = await captureMutation.mutateAsync(text.trim());
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
    <div className="min-h-full relative overflow-hidden">
      {/* Spotlight Effect */}
      <Spotlight className="-top-40 left-0 md:left-20 md:-top-20" fill="#6366f1" />

      {/* Secondary ambient light */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl px-6 sm:px-12 py-12 sm:py-24">
        <motion.form
          onSubmit={handleSubmit}
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Main Writing Area */}
          <div className="min-h-[300px]">
            <textarea
              value={text + (interimTranscript ? ` ${interimTranscript}` : "")}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-2xl sm:text-4xl leading-tight placeholder:text-slate-800 text-slate-100 font-medium overflow-hidden"
              placeholder="What's on your mind?"
              aria-label="Capture your thought"
              disabled={isSubmitting || isListening}
              rows={1}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = `${target.scrollHeight}px`;
              }}
              autoFocus
            />
          </div>

          {/* Action Bar (Floating at bottom of container) */}
          <div className="mt-12 flex items-center justify-between border-t border-slate-800/50 pt-8">
            <div className="flex items-center gap-6">
              {isSupported && (
                <button
                  type="button"
                  onClick={() => isListening ? stopListening() : startListening()}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    isListening
                      ? "bg-rose-500/10 text-rose-500"
                      : "text-slate-500 hover:text-white"
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span className="text-xs font-bold uppercase tracking-wider">{isListening ? "Listening..." : "Voice"}</span>
                </button>
              )}

              <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-700 uppercase tracking-widest">
                <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">⌘</kbd>
                <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">Enter</kbd>
                <span className="ml-1">to capture</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {(!isOnline || queueCount > 0) && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 border border-amber-500/10 rounded-full">
                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-amber-500" : "bg-amber-500 animate-pulse"}`} />
                  <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                    {!isOnline ? "Offline" : ""}{!isOnline && queueCount > 0 ? " · " : ""}{queueCount > 0 ? `${queueCount} queued` : ""}
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={!text.trim() || isSubmitting}
                className="px-8 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-20"
              >
                {isSubmitting ? "Capturing..." : "Capture"}
              </button>
            </div>
          </div>

          {/* Status Messages */}
          <div className="mt-8">
            {(error || voiceError) && (
              <motion.div
                role="alert"
                className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium flex items-center gap-3"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full flex-shrink-0" />
                <span className="truncate">{error || voiceError}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                role="status"
                className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-xl text-emerald-500/80 text-sm font-medium flex items-center gap-3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0 ${wasQueued ? "bg-amber-400" : clarificationCreated ? "bg-blue-400" : "bg-emerald-400"}`} />
                {wasQueued ? (
                  "Thought queued for later"
                ) : clarificationCreated ? (
                  <span>
                    Clarification needed.{" "}
                    <Link to="/clarifications" className="underline hover:text-emerald-300">
                      View
                    </Link>
                  </span>
                ) : (
                  "Captured to brain"
                )}
              </motion.div>
            )}
          </div>
        </motion.form>

        {/* Confetti celebration */}
        <Confetti trigger={success && !wasQueued && !clarificationCreated} />

        {/* Footer info */}
        <motion.div
          className="mt-32 flex items-center gap-8 text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
             <span className="text-sm opacity-30">✍️</span> Stream of Consciousness
          </div>
          <div className="flex items-center gap-2">
             <span className="text-sm opacity-30">🎯</span> Atomic Thoughts
          </div>
        </motion.div>
      </div>
    </div>
  );
}
