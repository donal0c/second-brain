import { useState, useEffect } from "react";
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
      <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
        {error}
      </div>
    );
  }

  if (activeNudges.length === 0) {
    return null; // Don't show anything if there are no nudges
  }

  return (
    <div className="space-y-3 mb-6">
      {activeNudges.map((nudge) => (
        <NudgeCard
          key={nudge.id}
          nudge={nudge}
          onDismiss={handleDismiss}
          onSnooze={handleSnooze}
        />
      ))}
    </div>
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
        return "⏰";
      case "task_stale":
        return "🕰️";
      case "project_missing_next_action":
        return "📋";
      case "person_follow_up":
        return "👤";
      case "follow_up_overdue":
        return "⚠️";
      default:
        return "💡";
    }
  };

  const getColorClasses = (type: Nudge["type"]) => {
    switch (type) {
      case "task_due_soon":
        return "bg-orange-500/10 border-orange-500/30 text-orange-400";
      case "task_stale":
        return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
      case "project_missing_next_action":
        return "bg-indigo-500/10 border-indigo-500/30 text-indigo-400";
      case "person_follow_up":
        return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      case "follow_up_overdue":
        return "bg-red-500/10 border-red-500/30 text-red-400";
      default:
        return "bg-slate-800/50 border-slate-700/50 text-slate-400";
    }
  };

  return (
    <div className={`rounded-lg border p-4 ${getColorClasses(nudge.type)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className="text-2xl">{getIcon(nudge.type)}</div>
          <div className="flex-1">
            <p className="text-sm font-medium">{nudge.message}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Snooze Button */}
          <div className="relative">
            <button
              onClick={() => setShowSnoozeOptions(!showSnoozeOptions)}
              className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              title="Snooze"
            >
              💤
            </button>

            {showSnoozeOptions && (
              <div className="absolute right-0 mt-1 bg-slate-800 rounded-lg shadow-lg border border-slate-700 py-1 z-10 min-w-32">
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 1);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700 text-slate-300"
                >
                  1 hour
                </button>
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 4);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700 text-slate-300"
                >
                  4 hours
                </button>
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 24);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700 text-slate-300"
                >
                  1 day
                </button>
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 72);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-slate-700 text-slate-300"
                >
                  3 days
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => onDismiss(nudge.id)}
            className="text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
