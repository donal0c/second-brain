import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  digest,
  tasks,
  extractErrorMessage,
  type DigestResponse,
  type Task,
} from "../lib/api";
import { formatDueDate } from "../lib/dateUtils";
import { LoadingSkeletonLarge } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";
import { TaskEditForm } from "../components/TaskEditForm";
import { NeuralCard } from "../components/ui/neural/NeuralCard";
import { NeuralNode } from "../components/ui/neural/NeuralNode";
import { EntityBadge } from "../components/ui/neural/EntityBadge";
import { SynapseButton } from "../components/ui/neural/SynapseButton";
import { useUIStream, type UIMessageChunk } from "../lib/stream";
import {
  DigestUrgentTasks,
  DigestStaleProjects,
  DigestTimeline,
  DigestIdeaNudge,
  DigestPersonReminder,
  DigestStats,
} from "../components/digest";

/** Get time-aware greeting based on current hour */
function getGreeting(): { greeting: string; emoji: string; message: string } {
  const hour = new Date().getHours();
  if (hour < 5) {
    return { greeting: "Night owl", emoji: "", message: "Burning the midnight oil?" };
  } else if (hour < 12) {
    return { greeting: "Good morning", emoji: "", message: "Let's make today count" };
  } else if (hour < 17) {
    return { greeting: "Good afternoon", emoji: "", message: "Stay focused, you're doing great" };
  } else if (hour < 21) {
    return { greeting: "Good evening", emoji: "", message: "Wrapping up for the day?" };
  } else {
    return { greeting: "Good night", emoji: "", message: "Time to wind down" };
  }
}

export function Today() {
  const [data, setData] = useState<DigestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadDigest = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await digest.daily(undefined, signal);
      setData(response);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadDigest(controller.signal);
    return () => controller.abort();
  }, []);

  const handleSave = async (taskData: Partial<Task>) => {
    if (!editingTask) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const updated = await tasks.update(editingTask.id, taskData);
      // Update the task in our local state (could be in nextActions or staleTasks)
      if (data) {
        // If task is no longer active, remove it from lists and update stats
        const isNowInactive = updated.status !== "active";
        const wasInNextActions = data.nextActions.some((t) => t.id === updated.id);
        const wasInStaleTasks = data.staleTasks.some((t) => t.id === updated.id);

        setData({
          ...data,
          nextActions: isNowInactive
            ? data.nextActions.filter((t) => t.id !== updated.id)
            : data.nextActions.map((t) => (t.id === updated.id ? updated : t)),
          staleTasks: isNowInactive
            ? data.staleTasks.filter((t) => t.id !== updated.id)
            : data.staleTasks.map((t) => (t.id === updated.id ? updated : t)),
          stats: {
            ...data.stats,
            activeTasks:
              isNowInactive && (wasInNextActions || wasInStaleTasks)
                ? data.stats.activeTasks - 1
                : data.stats.activeTasks,
          },
        });
      }
      setEditingTask(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleInterpret = async (instruction: string) => {
    if (!editingTask) return;

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const result = await tasks.interpret(editingTask.id, instruction);
      if (data) {
        // If task is no longer active, remove it from lists and update stats
        const isNowInactive = result.entity.status !== "active";
        const wasInNextActions = data.nextActions.some((t) => t.id === result.entity.id);
        const wasInStaleTasks = data.staleTasks.some((t) => t.id === result.entity.id);

        setData({
          ...data,
          nextActions: isNowInactive
            ? data.nextActions.filter((t) => t.id !== result.entity.id)
            : data.nextActions.map((t) => (t.id === result.entity.id ? result.entity : t)),
          staleTasks: isNowInactive
            ? data.staleTasks.filter((t) => t.id !== result.entity.id)
            : data.staleTasks.map((t) => (t.id === result.entity.id ? result.entity : t)),
          stats: {
            ...data.stats,
            activeTasks:
              isNowInactive && (wasInNextActions || wasInStaleTasks)
                ? data.stats.activeTasks - 1
                : data.stats.activeTasks,
          },
        });
      }
      setEditingTask(result.entity);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 1500);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTask) return;

    if (!window.confirm(`Are you sure you want to delete "${editingTask.title}"?`)) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      await tasks.delete(editingTask.id);
      if (data) {
        const wasInNextActions = data.nextActions.some((t) => t.id === editingTask.id);
        setData({
          ...data,
          nextActions: data.nextActions.filter((t) => t.id !== editingTask.id),
          staleTasks: data.staleTasks.filter((t) => t.id !== editingTask.id),
          stats: {
            ...data.stats,
            activeTasks: wasInNextActions
              ? data.stats.activeTasks - 1
              : data.stats.activeTasks,
          },
        });
      }
      setEditingTask(null);
    } catch (err) {
      setSaveError(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const timeGreeting = useMemo(() => getGreeting(), []);
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_URL || "http://localhost:3001",
    []
  );
  const digestStreamEndpoint = useMemo(() => `${apiBase}/digest/stream`, [apiBase]);
  const {
    parts: digestParts,
    status: digestStreamStatus,
    error: digestStreamError,
    start: startDigestStream,
  } = useUIStream(digestStreamEndpoint);

  useEffect(() => {
    if (!loading && !error && data) {
      startDigestStream({});
    }
  }, [loading, error, data, startDigestStream]);

  const streamedDigestOutputs = useMemo(() => {
    const outputs = digestParts.filter(
      (part: UIMessageChunk) => part.type === "tool-output-available"
    );
    return outputs.map((part) => (part as { output?: Record<string, unknown> }).output).filter(Boolean);
  }, [digestParts]);

  const streamedDigestContent = useMemo(() => {
    if (digestStreamError || streamedDigestOutputs.length === 0) {
      return null;
    }
    const hasNonStats = streamedDigestOutputs.some(
      (output) => output?.componentType && output.componentType !== "DigestStats"
    );
    if (!hasNonStats) {
      return null;
    }
    return (
      <div className="space-y-6">
        {streamedDigestOutputs.map((output, index) => {
          const componentType = output?.componentType;
          if (!componentType) {
            return null;
          }
          switch (componentType) {
            case "DigestUrgentTasks":
              return (
                <DigestUrgentTasks
                  key={`digest-urgent-${index}`}
                  tasks={(output?.tasks as any[]) ?? []}
                  onSelectTask={(id) => {
                    const task = data?.nextActions.find((t) => t.id === id);
                    if (task) setEditingTask(task);
                  }}
                />
              );
            case "DigestStaleProjects":
              return (
                <DigestStaleProjects
                  key={`digest-stale-${index}`}
                  projects={(output?.projects as any[]) ?? []}
                  staleDays={Number(output?.staleDays ?? 7)}
                />
              );
            case "DigestTimeline":
              return (
                <DigestTimeline
                  key={`digest-timeline-${index}`}
                  items={(output?.items as any[]) ?? []}
                />
              );
            case "DigestIdeaNudge":
              return (
                <DigestIdeaNudge
                  key={`digest-idea-${index}`}
                  idea={output?.idea as any}
                  reason={String(output?.reason ?? "")}
                />
              );
            case "DigestPersonReminder":
              return (
                <DigestPersonReminder
                  key={`digest-person-${index}`}
                  person={output?.person as any}
                  suggestion={String(output?.suggestion ?? "")}
                />
              );
            case "DigestStats":
              return (
                <DigestStats
                  key={`digest-stats-${index}`}
                  stats={output?.stats as any}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    );
  }, [digestStreamError, streamedDigestOutputs, data]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 min-h-full space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-white font-display">{timeGreeting.greeting}</h2>
          <p className="text-slate-400 mt-1">{timeGreeting.message}</p>
        </div>
        <LoadingSkeletonLarge />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 min-h-full space-y-6 animate-fade-in">
        <div>
          <h2 className="text-3xl font-bold text-white font-display">{timeGreeting.greeting}</h2>
          <p className="text-slate-400 mt-1">{timeGreeting.message}</p>
        </div>
        <ErrorBanner error={error} onRetry={() => loadDigest()} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-full space-y-8 animate-fade-in">
      {/* Neural Header with time-aware greeting */}
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h2 className="text-3xl font-bold text-white font-display mb-1">
            {timeGreeting.greeting}
          </h2>
          <p className="text-slate-400 text-lg">{timeGreeting.message}</p>
          <p className="text-slate-500 text-sm mt-2">{data?.date}</p>
        </div>
        <SynapseButton
          variant="ghost"
          size="sm"
          onClick={() => loadDigest()}
          data-testid="refresh-button"
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          }
        >
          Refresh
        </SynapseButton>
      </motion.div>

      {streamedDigestContent ? (
        <div className="space-y-6">
          {streamedDigestContent}
          {digestStreamStatus === "loading" && (
            <div className="text-sm text-slate-400">Loading personalized sections...</div>
          )}
        </div>
      ) : (
        <>
          {/* Neural Stats Grid */}
          <div className="grid grid-cols-3 gap-4" data-testid="stats-grid">
            {/* Active Tasks */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-neural-fire-500/10 to-neural-fire-500/5 rounded-xl border border-neural-fire-500/20 p-5 text-center group hover:border-neural-fire-500/40 hover:shadow-glow-task transition-all duration-300"
              data-testid="stat-active-tasks"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -2 }}
            >
              <NeuralNode type="task" size="sm" className="absolute top-3 right-3 opacity-60" />
              <div className="text-3xl font-bold text-neural-fire-400 font-display mb-1" data-testid="stat-active-tasks-value">
                {data?.stats.activeTasks}
              </div>
              <div className="text-sm text-slate-400 font-medium" data-testid="stat-active-tasks-label">
                Active Tasks
              </div>
            </motion.div>

            {/* Active Projects */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-neural-pulse-500/10 to-neural-pulse-500/5 rounded-xl border border-neural-pulse-500/20 p-5 text-center group hover:border-neural-pulse-500/40 hover:shadow-glow-project transition-all duration-300"
              data-testid="stat-active-projects"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 }}
              whileHover={{ y: -2 }}
            >
              <NeuralNode type="project" size="sm" className="absolute top-3 right-3 opacity-60" />
              <div className="text-3xl font-bold text-neural-pulse-400 font-display mb-1" data-testid="stat-active-projects-value">
                {data?.stats.activeProjects}
              </div>
              <div className="text-sm text-slate-400 font-medium" data-testid="stat-active-projects-label">
                Active Projects
              </div>
            </motion.div>

            {/* Ideas */}
            <motion.div
              className="relative overflow-hidden bg-gradient-to-br from-neural-memory-500/10 to-neural-memory-500/5 rounded-xl border border-neural-memory-500/20 p-5 text-center group hover:border-neural-memory-500/40 hover:shadow-glow-idea transition-all duration-300"
              data-testid="stat-ideas"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -2 }}
            >
              <NeuralNode type="idea" size="sm" className="absolute top-3 right-3 opacity-60" />
              <div className="text-3xl font-bold text-neural-memory-400 font-display mb-1" data-testid="stat-ideas-value">
                {data?.stats.ideas}
              </div>
              <div className="text-sm text-slate-400 font-medium" data-testid="stat-ideas-label">
                Ideas
              </div>
            </motion.div>
          </div>

      {/* Next Actions - Main Focus Area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="flex items-center gap-3 mb-4">
          <NeuralNode type="task" size="md" pulse />
          <h3 className="text-xl font-semibold text-white">Next Actions</h3>
          {data?.nextActions && data.nextActions.length > 0 && (
            <span className="text-sm text-slate-500">({data.nextActions.length})</span>
          )}
        </div>
        {data?.nextActions.length === 0 ? (
          <div className="bg-gradient-to-br from-void-50/60 to-void-100/80 rounded-xl border border-void-border p-8 text-center" data-testid="empty-next-actions">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neural-fire-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-neural-fire-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-300 text-lg mb-1">All caught up!</p>
            <p className="text-slate-500 text-sm">No active tasks. Time to capture some thoughts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {data?.nextActions.map((task) => {
              const due = formatDueDate(task.dueDate);
              return (
                <NeuralCard
                  key={task.id}
                  entityType="task"
                  padding="md"
                  onClick={() => setEditingTask(task)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white leading-tight">{task.title}</h4>
                      {task.nextAction && (
                        <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{task.nextAction}</p>
                      )}
                    </div>
                    {due && (
                      <span className={`text-sm font-medium whitespace-nowrap ${due.color}`}>
                        {due.text}
                      </span>
                    )}
                  </div>
                  {task.context && (
                    <div className="mt-3">
                      <span className="text-xs px-2.5 py-1 bg-void-50/50 border border-void-border rounded-full text-slate-400 font-medium">
                        {task.context}
                      </span>
                    </div>
                  )}
                </NeuralCard>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Flagged Items - Needs Attention */}
      {data?.flaggedItems && data.flaggedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 rounded-full bg-error/20 flex items-center justify-center animate-neural-pulse">
              <div className="w-2.5 h-2.5 rounded-full bg-error" />
            </div>
            <h3 className="text-xl font-semibold text-white">Flagged for Review</h3>
            <span className="text-sm text-error">({data.flaggedItems.length})</span>
          </div>
          <div className="space-y-3">
            {data.flaggedItems.map((receipt) => (
              <motion.div
                key={receipt.id}
                className="bg-gradient-to-br from-error/10 to-error/5 border border-error/30 rounded-xl p-5 hover:border-error/50 hover:shadow-[0_0_20px_-4px_rgba(239,68,68,0.3)] transition-all duration-300"
                whileHover={{ y: -1 }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs px-2.5 py-1 bg-error/20 rounded-full text-error font-medium capitalize">
                        {receipt.classification}
                      </span>
                      {receipt.confidenceScore < 0.7 && (
                        <span className="text-xs px-2.5 py-1 bg-warning/20 rounded-full text-warning font-medium">
                          {Math.round(receipt.confidenceScore * 100)}% confidence
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-300">
                      {receipt.extractedFields?.title as string || receipt.extractedFields?.content as string || 'Review required'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(receipt.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Stale Tasks - Needs Attention with pulsing animation */}
      {data?.staleTasks && data.staleTasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <NeuralNode type="task" size="md" pulse color="rgba(245, 158, 11, 0.8)" />
            <h3 className="text-xl font-semibold text-white">Stale Tasks</h3>
            <span className="text-sm text-warning">({data.staleTasks.length})</span>
          </div>
          <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-xl p-5">
            <p className="text-warning/80 text-sm mb-4">
              These tasks haven't been updated recently. Consider reviewing or completing them.
            </p>
            <div className="space-y-3">
              {data.staleTasks.map((task) => {
                const due = formatDueDate(task.dueDate);
                return (
                  <motion.div
                    key={task.id}
                    onClick={() => setEditingTask(task)}
                    className="bg-void-50/50 rounded-lg border border-warning/20 p-4 cursor-pointer hover:border-warning/40 hover:shadow-[0_0_15px_-4px_rgba(245,158,11,0.3)] transition-all duration-300"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-white leading-tight">{task.title}</h4>
                        {task.nextAction && (
                          <p className="text-sm text-slate-400 mt-1">{task.nextAction}</p>
                        )}
                      </div>
                      {due && (
                        <span className={`text-xs font-medium whitespace-nowrap ${due.color}`}>
                          {due.text}
                        </span>
                      )}
                    </div>
                    {task.context && (
                      <div className="mt-2">
                        <span className="text-xs px-2 py-0.5 bg-void-100/50 rounded text-slate-500">
                          {task.context}
                        </span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Projects Without Next Action */}
      {data?.projectsWithoutNextAction && data.projectsWithoutNextAction.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <NeuralNode type="project" size="md" />
            <h3 className="text-xl font-semibold text-white">Projects Needing Next Action</h3>
            <span className="text-sm text-neural-pulse-400">({data.projectsWithoutNextAction.length})</span>
          </div>
          <div className="bg-gradient-to-br from-neural-pulse-500/10 to-neural-pulse-500/5 border border-neural-pulse-500/20 rounded-xl p-5">
            <p className="text-neural-pulse-400/80 text-sm mb-4">
              These active projects don't have a next action defined.
            </p>
            <div className="space-y-3">
              {data.projectsWithoutNextAction.map((project) => (
                <motion.a
                  key={project.id}
                  href={`/browse?type=project&id=${project.id}`}
                  className="block bg-void-50/50 rounded-lg border border-neural-pulse-500/20 p-4 hover:border-neural-pulse-500/40 hover:shadow-glow-project transition-all duration-300"
                  whileHover={{ x: 2 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <EntityBadge type="project" size="sm" />
                    <h4 className="font-medium text-white">{project.name}</h4>
                  </div>
                  {project.desiredOutcome && (
                    <p className="text-sm text-slate-400 mt-1 pl-7">{project.desiredOutcome}</p>
                  )}
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* New Contexts Discovered */}
      {data?.newContexts && data.newContexts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <NeuralNode type="idea" size="md" />
            <h3 className="text-xl font-semibold text-white">New Contexts</h3>
            <span className="text-sm text-neural-memory-400">({data.newContexts.length})</span>
          </div>
          <div className="bg-gradient-to-br from-neural-memory-500/10 to-neural-memory-500/5 border border-neural-memory-500/20 rounded-xl p-5">
            <p className="text-neural-memory-400/80 text-sm mb-4">
              Recently learned contexts that may need descriptions.
            </p>
            <div className="flex flex-wrap gap-2">
              {data.newContexts.map((ctx) => (
                <motion.div
                  key={ctx.id}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-void-50/50 rounded-lg border border-neural-memory-500/20 hover:border-neural-memory-500/40 hover:shadow-glow-idea transition-all duration-300"
                  whileHover={{ scale: 1.02 }}
                >
                  <span className="font-medium text-white">{ctx.name}</span>
                  <span className="text-xs px-2 py-0.5 bg-neural-memory-500/20 rounded-full text-neural-memory-400 capitalize font-medium">
                    {ctx.type}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Pending Clarifications */}
      {data?.pendingClarifications && data.pendingClarifications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-5 h-5 rounded-full bg-warning/20 flex items-center justify-center">
              <svg className="w-3 h-3 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white">Needs Your Input</h3>
          </div>
          <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-xl p-5">
            <p className="text-warning font-medium mb-3">
              {data.pendingClarifications.length} item{data.pendingClarifications.length > 1 ? 's' : ''} waiting for clarification
            </p>
            <SynapseButton
              variant="secondary"
              size="sm"
              onClick={() => window.location.href = '/clarifications'}
              iconRight={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              }
            >
              Review now
            </SynapseButton>
          </div>
        </motion.div>
      )}

        </>
      )}

      {/* Edit Task Modal */}
      <Modal
        isOpen={!!editingTask}
        onClose={() => {
          setEditingTask(null);
          setSaveError(null);
        }}
        title="Edit Task"
      >
        {saveError && (
          <motion.div
            className="mb-4 p-4 bg-error/10 border border-error/30 rounded-xl text-error text-sm flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{saveError}</span>
          </motion.div>
        )}

        {saveSuccess && (
          <motion.div
            className="mb-4 p-4 bg-success/10 border border-success/30 rounded-xl text-success text-sm flex items-center gap-2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Saved successfully!</span>
          </motion.div>
        )}

        {editingTask && (
          <TaskEditForm
            task={editingTask}
            onSave={handleSave}
            onInterpret={handleInterpret}
            onDelete={handleDelete}
            onCancel={() => setEditingTask(null)}
            saving={saving}
          />
        )}
      </Modal>
    </div>
  );
}
