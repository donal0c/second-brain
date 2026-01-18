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

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Animated Header */}
        <motion.header
          className="mb-8 sm:mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-5xl font-bold tracking-tight font-display mb-3">
            <TextShimmer className="text-white">Capture</TextShimmer>
          </h2>
          <motion.p
            className="text-slate-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Dump thoughts, tasks, and ideas into your second brain.
          </motion.p>
        </motion.header>

        {/* 3D Card Input */}
        <CardContainer containerClassName="py-0">
          <CardBody className="w-full max-w-2xl">
            <motion.form
              onSubmit={handleSubmit}
              className="relative"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CardItem translateZ={50} className="w-full">
                <div className="group bg-slate-900/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl shadow-indigo-500/10 transition-all duration-500 focus-within:shadow-indigo-500/20 focus-within:border-indigo-500/30">
                  <div className="p-4 sm:p-8">
                    <textarea
                      value={text + (interimTranscript ? ` ${interimTranscript}` : "")}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full h-40 sm:h-48 p-0 bg-transparent border-0 focus:ring-0 focus:outline-none resize-none text-lg sm:text-xl leading-relaxed placeholder:text-slate-600 text-white font-medium"
                      placeholder="What's on your mind?"
                      aria-label="Capture your thought"
                      disabled={isSubmitting || isListening}
                      autoFocus
                    />
                  </div>

                  <div className="px-4 sm:px-8 py-4 sm:py-6 bg-slate-800/50 border-t border-slate-700/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-6">
                      <div className="hidden sm:flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                        <div className="flex gap-1">
                          <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded-md text-slate-400 shadow-sm font-sans">CMD</kbd>
                          <kbd className="px-2 py-1 bg-slate-800 border border-slate-600 rounded-md text-slate-400 shadow-sm font-sans">ENTER</kbd>
                        </div>
                        <span>to submit</span>
                      </div>

                      {(!isOnline || queueCount > 0) && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-full">
                          <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-amber-400" : "bg-amber-500 animate-pulse"}`} />
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">
                            {!isOnline ? "Offline" : ""}{!isOnline && queueCount > 0 ? " · " : ""}{queueCount > 0 ? `${queueCount} queued` : ""}
                          </span>
                        </div>
                      )}

                      {isSupported && (
                        <button
                          type="button"
                          onClick={() => isListening ? stopListening() : startListening()}
                          className={`p-2.5 sm:p-3 rounded-full transition-all duration-300 ${
                            isListening
                              ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30 animate-pulse"
                              : "bg-slate-800 text-slate-400 hover:text-white border border-slate-600"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <CardItem translateZ={80}>
                      <button
                        type="submit"
                        disabled={!text.trim() || isSubmitting}
                        className="px-6 sm:px-10 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-full font-bold text-sm shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-20 disabled:pointer-events-none tracking-wide"
                      >
                        {isSubmitting ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Capturing...
                          </span>
                        ) : "Capture"}
                      </button>
                    </CardItem>
                  </div>
                </div>
              </CardItem>

              {/* Confetti celebration */}
              <Confetti trigger={success && !wasQueued && !clarificationCreated} />

              {/* Status Messages */}
              <div className="absolute -bottom-16 sm:-bottom-20 left-0 right-0">
                {(error || voiceError) && (
                  <motion.div
                    role="alert"
                    className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl sm:rounded-2xl text-rose-400 text-sm font-semibold flex items-center gap-3"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-2 h-2 bg-rose-500 rounded-full flex-shrink-0" />
                    <span className="truncate">{error || voiceError}</span>
                  </motion.div>
                )}

                {success && (
                  <motion.div
                    role="status"
                    className="p-4 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl sm:rounded-2xl text-white text-sm font-semibold flex items-center gap-3"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <span className={`w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${wasQueued ? "bg-amber-400" : clarificationCreated ? "bg-blue-400" : "bg-emerald-400"}`} />
                    {wasQueued ? (
                      "Queued for sync — will upload when online"
                    ) : clarificationCreated ? (
                      <span>
                        Captured! We have a question about this item.{" "}
                        <Link to="/clarifications" className="underline hover:text-indigo-300">
                          View clarification
                        </Link>
                      </span>
                    ) : (
                      "Successfully captured to inbox"
                    )}
                  </motion.div>
                )}
              </div>
            </motion.form>
          </CardBody>
        </CardContainer>

        {/* Tips Section */}
        <motion.section
          className="mt-32 sm:mt-40 pt-8 sm:pt-12 border-t border-slate-800"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          <h3 className="text-xs font-bold text-slate-600 uppercase tracking-[0.3em] mb-6 sm:mb-8">Best Practices</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {[
              { title: "Stream of Consciousness", desc: "Don't edit yourself. Just get the words out. We'll handle the formatting later.", icon: "✍️" },
              { title: "Atomic Thoughts", desc: "One idea per capture works best for our processing engine to categorize correctly.", icon: "🎯" }
            ].map((tip, i) => (
              <motion.div
                key={tip.title}
                className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all duration-300 group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1, duration: 0.4 }}
                whileHover={{ scale: 1.02 }}
              >
                <div className="text-2xl mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300 inline-block">{tip.icon}</div>
                <h4 className="text-base font-bold text-white mb-1">{tip.title}</h4>
                <p className="text-sm text-slate-400 leading-relaxed">{tip.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
