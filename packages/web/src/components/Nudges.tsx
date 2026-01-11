import { useState, useEffect } from "react";
import { nudges, type Nudge, type ApiError } from "../lib/api";

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
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to load nudges");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadNudges(controller.signal);

    // Set up periodic refresh
    const interval = setInterval(() => {
      loadNudges();
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
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to dismiss nudge");
    }
  };

  const handleSnooze = async (nudgeId: string, hours: number = 24) => {
    try {
      await nudges.snooze(nudgeId, hours);
      setActiveNudges((prev) => prev.filter((n) => n.id !== nudgeId));
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to snooze nudge");
    }
  };

  if (loading && activeNudges.length === 0) {
    return null; // Don't show loading state for nudges
  }

  if (error) {
    return (
      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
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
        return "bg-orange-50 border-orange-200 text-orange-800";
      case "task_stale":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      case "project_missing_next_action":
        return "bg-primary-subtle border-primary-200 text-primary-800";
      case "person_follow_up":
        return "bg-purple-50 border-purple-200 text-purple-800";
      case "follow_up_overdue":
        return "bg-red-50 border-red-200 text-red-800";
      default:
        return "bg-gray-50 border-gray-200 text-gray-800";
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
              className="text-xs px-2 py-1 rounded hover:bg-black/5 transition-colors"
              title="Snooze"
            >
              💤
            </button>

            {showSnoozeOptions && (
              <div className="absolute right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-32">
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 1);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                >
                  1 hour
                </button>
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 4);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                >
                  4 hours
                </button>
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 24);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                >
                  1 day
                </button>
                <button
                  onClick={() => {
                    onSnooze(nudge.id, 72);
                    setShowSnoozeOptions(false);
                  }}
                  className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-gray-700"
                >
                  3 days
                </button>
              </div>
            )}
          </div>

          {/* Dismiss Button */}
          <button
            onClick={() => onDismiss(nudge.id)}
            className="text-xs px-2 py-1 rounded hover:bg-black/5 transition-colors"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
