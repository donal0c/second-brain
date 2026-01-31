import { useState, useEffect, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { extractErrorMessage } from "../lib/api";
import { useCapture } from "../lib/queries";
import { useVoiceCapture } from "../hooks/useVoiceCapture";
import { useOfflineQueue } from "../hooks/useOfflineQueue";
import { NeuralBackground, SynapseButton, NeuralNode } from "../components/ui/neural";
import { Confetti } from "../components/ui/Confetti";

type CaptureMode = "stream" | "atomic";

export function Capture() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState<CaptureMode>("stream");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wasQueued, setWasQueued] = useState(false);
  const [clarificationCreated, setClarificationCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentCaptures, setRecentCaptures] = useState<{ id: number; text: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

    const capturedText = text.trim();

    try {
      const queued = !isOnline;
      if (isOnline) {
        const response = await captureMutation.mutateAsync(capturedText);
        setClarificationCreated(!!response.result?.clarification);
      } else {
        await addToQueue(capturedText);
      }

      // Add to recent captures for visual feedback
      setRecentCaptures((prev) => [
        { id: Date.now(), text: capturedText.slice(0, 50) },
        ...prev.slice(0, 4),
      ]);

      setText("");
      setWasQueued(queued);
      setSuccess(true);

      // Auto-resize textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      const isNetworkFailure =
        err instanceof TypeError ||
        (typeof err === "object" &&
          err !== null &&
          "message" in err &&
          /failed to fetch|networkerror|network error/i.test(String((err as { message?: string }).message)));
      if (isOnline && isNetworkFailure) {
        try {
          await addToQueue(capturedText);
          setRecentCaptures((prev) => [
            { id: Date.now(), text: capturedText.slice(0, 50) },
            ...prev.slice(0, 4),
          ]);
          setText("");
          setWasQueued(true);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 5000);
          return;
        } catch (queueError) {
          console.error("Failed to enqueue capture after network error:", queueError);
        }
      }
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

  const hasContent = text.trim().length > 0;

  return (
    <div className="min-h-full relative overflow-hidden neural-bg">
      {/* Neural Network Background */}
      <NeuralBackground
        nodeCount={40}
        showConnections={true}
        connectionDistance={120}
        intensity={hasContent ? 0.8 : 0.4}
        focalPoint={hasContent ? { x: 0.5, y: 0.4 } : null}
      />

      {/* Ambient glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-neural-memory-500/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-neural-pulse-500/10 rounded-full blur-[80px]" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-neural-fire-500/5 rounded-full blur-[60px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-12 py-12 sm:py-20">
        <motion.form
          onSubmit={handleSubmit}
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Hero Title */}
          <motion.h1
            className="font-hero text-hero-lg sm:text-hero-xl text-slate-400 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            What's on your mind?
          </motion.h1>

          {/* Main Writing Area */}
          <motion.div
            className="relative min-h-[200px] neural-border-animated rounded-neural p-1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-void-100/50 backdrop-blur-xl rounded-[calc(1rem-4px)] p-6">
              <textarea
                ref={textareaRef}
                value={text + (interimTranscript ? ` ${interimTranscript}` : "")}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-xl sm:text-2xl leading-relaxed placeholder:text-slate-600 text-slate-100 font-medium"
                placeholder={mode === "stream"
                  ? "Let your thoughts flow freely..."
                  : "One clear thought..."}
                aria-label="Capture your thought"
                disabled={isSubmitting || isListening}
                rows={4}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.max(100, target.scrollHeight)}px`;
                }}
                autoFocus
              />

              {/* Character indicator for atomic mode */}
              {mode === "atomic" && text.length > 0 && (
                <motion.div
                  className="absolute bottom-4 right-4 text-xs text-slate-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {text.length} chars
                </motion.div>
              )}
            </div>

            {/* Typing indicator glow */}
            <AnimatePresence>
              {hasContent && (
                <motion.div
                  className="absolute inset-0 rounded-neural pointer-events-none"
                  style={{
                    boxShadow: "0 0 40px -10px rgba(139, 92, 246, 0.4)",
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
          </motion.div>

          {/* Action Bar */}
          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center gap-4">
              {/* Voice Button */}
              {isSupported && (
                <motion.button
                  type="button"
                  onClick={() => isListening ? stopListening() : startListening()}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-neural
                    transition-all duration-neural
                    ${isListening
                      ? "bg-error/20 text-error border border-error/30 shadow-[0_0_20px_-4px_rgba(239,68,68,0.4)]"
                      : "bg-void-50/50 text-slate-400 border border-void-border hover:text-white hover:border-neural-memory-500/30"
                    }
                  `}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Microphone icon with animation */}
                  <div className="relative">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    {isListening && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-error/30"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                    )}
                  </div>
                  <span className="text-sm font-semibold">
                    {isListening ? "Listening..." : "Voice"}
                  </span>
                </motion.button>
              )}

              {/* Keyboard hint */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
                <kbd className="px-2 py-1 bg-void-100 border border-void-border rounded-md font-mono">⌘</kbd>
                <kbd className="px-2 py-1 bg-void-100 border border-void-border rounded-md font-mono">Enter</kbd>
                <span className="ml-1 text-slate-500">to capture</span>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto">
              {/* Offline/Queue indicator */}
              <AnimatePresence>
                {(!isOnline || queueCount > 0) && (
                  <motion.div
                    className="flex items-center gap-2 px-3 py-2 bg-neural-fire-500/10 border border-neural-fire-500/20 rounded-full"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                  >
                    <NeuralNode type="task" size="xs" pulse={!isOnline} />
                    <span className="text-xs font-semibold text-neural-fire-400">
                      {!isOnline ? "Offline" : ""}{!isOnline && queueCount > 0 ? " · " : ""}{queueCount > 0 ? `${queueCount} queued` : ""}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Capture Button */}
              <SynapseButton
                type="submit"
                disabled={!hasContent || isSubmitting}
                loading={isSubmitting}
                size="lg"
                className="flex-1 sm:flex-none sm:min-w-[140px]"
              >
                Capture
              </SynapseButton>
            </div>
          </motion.div>

          {/* Status Messages */}
          <div className="mt-6 space-y-3">
            <AnimatePresence mode="wait">
              {(error || voiceError) && (
                <motion.div
                  key="error"
                  role="alert"
                  className="p-4 bg-error/10 border border-error/20 rounded-neural text-error text-sm font-medium flex items-center gap-3"
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                >
                  <NeuralNode type="task" size="xs" color="#EF4444" />
                  <span>{error || voiceError}</span>
                </motion.div>
              )}

              {success && (
                <motion.div
                  key="success"
                  role="status"
                  className={`
                    p-4 rounded-neural text-sm font-medium flex items-center gap-3
                    ${wasQueued
                      ? "bg-neural-fire-500/10 border border-neural-fire-500/20 text-neural-fire-400"
                      : clarificationCreated
                        ? "bg-neural-pulse-500/10 border border-neural-pulse-500/20 text-neural-pulse-400"
                        : "bg-success/10 border border-success/20 text-success"
                    }
                  `}
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                >
                  <NeuralNode
                    type={wasQueued ? "task" : clarificationCreated ? "project" : "idea"}
                    size="xs"
                    pulse
                    color={wasQueued ? "#F59E0B" : clarificationCreated ? "#06B6D4" : "#10B981"}
                  />
                  {wasQueued ? (
                    "Thought queued for sync"
                  ) : clarificationCreated ? (
                    <span>
                      Clarification needed.{" "}
                      <Link to="/clarifications" className="underline hover:text-neural-pulse-300 transition-colors">
                        View
                      </Link>
                    </span>
                  ) : (
                    "Captured to your second brain"
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Recent captures visualization */}
          <AnimatePresence>
            {recentCaptures.length > 0 && (
              <motion.div
                className="mt-8 flex flex-wrap gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {recentCaptures.map((capture, i) => (
                  <motion.div
                    key={capture.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-void-50/30 border border-void-border rounded-full text-xs text-slate-500"
                    initial={{ opacity: 0, scale: 0, x: -20 }}
                    animate={{ opacity: 0.5 - i * 0.1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <NeuralNode type="idea" size="xs" />
                    <span className="truncate max-w-[150px]">{capture.text}</span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.form>

        {/* Confetti celebration */}
        <Confetti trigger={success && !wasQueued && !clarificationCreated} />

        {/* Mode Toggle */}
        <motion.div
          className="mt-24 flex items-center justify-center gap-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <button
            type="button"
            onClick={() => setMode("stream")}
            className={`
              group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-neural
              ${mode === "stream"
                ? "bg-neural-memory-500/20 text-neural-memory-400 border border-neural-memory-500/30"
                : "text-slate-600 hover:text-slate-400 border border-transparent"
              }
            `}
          >
            <span className="text-lg">✍️</span>
            <span className="text-sm font-medium">Stream of Consciousness</span>
            {mode === "stream" && (
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-neural-memory-400"
                layoutId="mode-indicator"
              />
            )}
          </button>

          <div className="w-px h-6 bg-void-border" />

          <button
            type="button"
            onClick={() => setMode("atomic")}
            className={`
              group flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-neural
              ${mode === "atomic"
                ? "bg-neural-pulse-500/20 text-neural-pulse-400 border border-neural-pulse-500/30"
                : "text-slate-600 hover:text-slate-400 border border-transparent"
              }
            `}
          >
            <span className="text-lg">🎯</span>
            <span className="text-sm font-medium">Atomic Thoughts</span>
            {mode === "atomic" && (
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-neural-pulse-400"
                layoutId="mode-indicator"
              />
            )}
          </button>
        </motion.div>

        {/* Mode description */}
        <motion.p
          className="mt-4 text-center text-xs text-slate-600 max-w-md mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          {mode === "stream"
            ? "Let your thoughts flow freely. Write as much as you want - we'll extract the key insights."
            : "One clear, focused thought per capture. Best for tasks, ideas, or notes."}
        </motion.p>
      </div>
    </div>
  );
}
