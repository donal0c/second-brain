import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { nudges, extractErrorMessage, type Nudge } from "../lib/api";

interface NudgesProps {
  /** Refresh interval in milliseconds (default: 5 minutes) */
  refreshInterval?: number;
}

export function Nudges({ refreshInterval = 5 * 60 * 1000 }: NudgesProps) {
  const [activeNudges, setActiveNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNudges = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await nudges.list(signal);
      setActiveNudges(response.nudges);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let controller = new AbortController();
    loadNudges(controller.signal);

    // Set up periodic refresh
    const interval = setInterval(() => {
      // Abort any in-flight request before starting a new one
      controller.abort();
      controller = new AbortController();
      loadNudges(controller.signal);
    }, refreshInterval);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [refreshInterval]);

  const handleDismiss = async (nudgeId: string) => {
    try {
      await nudges.dismiss(nudgeId);
      setActiveNudges((prev) => prev.filter((n) => n.id !== nudgeId));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  const handleSnooze = async (nudgeId: string, hours: number = 24) => {
    try {
      await nudges.snooze(nudgeId, hours);
      setActiveNudges((prev) => prev.filter((n) => n.id !== nudgeId));
    } catch (err) {
      setError(extractErrorMessage(err));
    }
  };

  if (loading && activeNudges.length === 0) {
    return null; // Don't show loading state for nudges
  }

  if (error) {
    return (
      <div className="mb-4 p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm flex items-center gap-2">
        <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (activeNudges.length === 0) {
    return null; // Don't show anything if there are no nudges
  }

  return (
    <motion.div
      className="space-y-3 mb-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {activeNudges.map((nudge) => (
        <NudgeCard
          key={nudge.id}
          nudge={nudge}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
        />
      ))}
    </motion.div>
  );
}

// =============================================================================
// Nudge Card Component
// =============================================================================

interface NudgeCardProps {
  nudge: Nudge;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, hours: number) => void;
}

function NudgeCard({ nudge, onDismiss, onSnooze }: NudgeCardProps) {
  const [showSnoozeOptions, setShowSnoozeOptions] = useState(false);

  const getIcon = (type: Nudge["type"]) => {
    switch (type) {
      case "task_due_soon":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "task_stale":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "project_missing_next_action":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        );
      case "person_follow_up":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case "follow_up_overdue":
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
    }
  };

  const getColorClasses = (type: Nudge["type"]) => {
    switch (type) {
      case "task_due_soon":
        return {
          container: "bg-gradient-to-br from-neural-fire-500/10 to-neural-fire-500/5 border-neural-fire-500/30",
          icon: "bg-neural-fire-500/20 text-neural-fire-400",
          text: "text-neural-fire-400",
        };
      case "task_stale":
        return {
          container: "bg-gradient-to-br from-warning/10 to-warning/5 border-warning/30",
          icon: "bg-warning/20 text-warning",
          text: "text-warning",
        };
      case "project_missing_next_action":
        return {
          container: "bg-gradient-to-br from-neural-pulse-500/10 to-neural-pulse-500/5 border-neural-pulse-500/30",
          icon: "bg-neural-pulse-500/20 text-neural-pulse-400",
          text: "text-neural-pulse-400",
        };
      case "person_follow_up":
        return {
          container: "bg-gradient-to-br from-entity-person/10 to-entity-person/5 border-entity-person/30",
          icon: "bg-entity-person/20 text-pink-400",
          text: "text-pink-400",
        };
      case "follow_up_overdue":
        return {
          container: "bg-gradient-to-br from-error/10 to-error/5 border-error/30",
          icon: "bg-error/20 text-error",
          text: "text-error",
        };
      default:
        return {
          container: "bg-gradient-to-br from-neural-memory-500/10 to-neural-memory-500/5 border-neural-memory-500/30",
          icon: "bg-neural-memory-500/20 text-neural-memory-400",
          text: "text-neural-memory-400",
        };
    }
  };

  const colors = getColorClasses(nudge.type);

  return (
    <motion.div
      className={`rounded-xl border p-4 ${colors.container} hover:shadow-neural-sm transition-all duration-300`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 100 }}
      whileHover={{ y: -1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.icon}`}>
            {getIcon(nudge.type)}
          </div>
          <div className="flex-1 pt-0.5">
            <p className={`text-sm font-medium ${colors.text}`}>{nudge.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Snooze Button */}
          <div className="relative">
            <button
              onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
              className="p-2 rounded-lg hover:bg-void-50/50 transition-colors text-slate-400 hover:text-slate-200"
              title="Snooze"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>

            {showSnoozeOptions && (
              <motion.div
                className="absolute right-0 mt-1 bg-void-100 rounded-xl shadow-lg shadow-black/20 border border-void-border py-1.5 z-10 min-w-36"
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
              >
                {[
                  { hours: 1, label: "1 hour" },
                  { hours: 4, label: "4 hours" },
                  { hours: 24, label: "1 day" },
                  { hours: 72, label: "3 days" },
                ].map((option) => (
                  <button
                    key={option.hours}
                    onClick={() => {
                      onSnooze(nudge.id, option.hours);
                      setShowSnoozeOptions(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-void-50/50 text-slate-300 hover:text-white transition-colors"
                  >
                    {option.label}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => onDismiss(nudge.id)}
            className="p-2 rounded-lg hover:bg-void-50/50 transition-colors text-slate-400 hover:text-slate-200"
            title="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
