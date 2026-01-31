import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  digest,
  extractErrorMessage,
  type WeeklyReviewResponse,
} from "../lib/api";
import { NeuralNode } from "../components/ui/neural/NeuralNode";
import { SynapseButton } from "../components/ui/neural/SynapseButton";
import { LoadingSkeletonLarge } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";

export function WeeklyReview() {
  const [data, setData] = useState<WeeklyReviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadWeeklyReview = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await digest.weekly(signal);
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
    loadWeeklyReview(controller.signal);
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8 min-h-full space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <NeuralNode type="idea" size="lg" pulse />
          <h2 className="text-3xl font-bold text-white font-display">Weekly Review</h2>
        </div>
        <LoadingSkeletonLarge />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 md:p-8 min-h-full space-y-6 animate-fade-in">
        <div className="flex items-center gap-3">
          <NeuralNode type="idea" size="lg" />
          <h2 className="text-3xl font-bold text-white font-display">Weekly Review</h2>
        </div>
        <ErrorBanner error={error} onRetry={() => loadWeeklyReview()} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 min-h-full space-y-8 animate-fade-in">
      {/* Neural Header */}
      <motion.div
        className="flex items-start justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <div className="flex items-center gap-3 mb-2">
            <NeuralNode type="idea" size="lg" pulse />
            <h2 className="text-3xl font-bold text-white font-display">Weekly Review</h2>
          </div>
          <p className="text-slate-400 text-lg">
            {data?.weekStart} to {data?.weekEnd}
          </p>
        </div>
        <SynapseButton
          variant="ghost"
          size="sm"
          onClick={() => loadWeeklyReview()}
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

        {/* Wins / Completed Items - Neural success styling */}
        {data && (data.wins.totalTasks > 0 || data.wins.totalProjects > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white">Wins This Week</h3>
              <span className="text-sm text-success">({data.wins.totalTasks + data.wins.totalProjects})</span>
            </div>
            <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-xl p-6">
              {data.wins.completedTasks.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-2 mb-3">
                    <NeuralNode type="task" size="sm" />
                    <h4 className="text-sm font-semibold text-success">
                      Completed Tasks ({data.wins.totalTasks})
                    </h4>
                  </div>
                  <div className="space-y-2 pl-6">
                    {data.wins.completedTasks.slice(0, 10).map((task) => (
                      <motion.div
                        key={task.id}
                        className="flex items-center gap-2 text-sm text-slate-300/80"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <svg className="w-4 h-4 text-success/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="line-through opacity-70">{task.title}</span>
                      </motion.div>
                    ))}
                    {data.wins.totalTasks > 10 && (
                      <div className="text-sm text-success/60 italic pl-6">
                        ...and {data.wins.totalTasks - 10} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}
              {data.wins.completedProjects.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <NeuralNode type="project" size="sm" />
                    <h4 className="text-sm font-semibold text-success">
                      Completed Projects ({data.wins.totalProjects})
                    </h4>
                  </div>
                  <div className="space-y-2 pl-6">
                    {data.wins.completedProjects.map((project) => (
                      <motion.div
                        key={project.id}
                        className="flex items-center gap-2 text-sm text-slate-300/80"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <svg className="w-4 h-4 text-success/60 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="line-through opacity-70">{project.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Open Loops - Carry Forward */}
        {data && data.openLoops.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <NeuralNode type="task" size="md" pulse />
              <h3 className="text-xl font-semibold text-white">Open Loops</h3>
              <span className="text-sm text-neural-fire-400">({data.openLoops.total})</span>
            </div>
            <div className="bg-gradient-to-br from-neural-fire-500/10 to-neural-fire-500/5 border border-neural-fire-500/20 rounded-xl p-5">
              <p className="text-slate-400 text-sm mb-4">
                You have <span className="text-neural-fire-400 font-semibold">{data.openLoops.total}</span> active tasks in your system.
              </p>
              {data.openLoops.total > 20 && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning text-sm flex items-center gap-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Consider reviewing your tasks - you might have too many open loops.</span>
                </div>
              )}
              <div className="space-y-2">
                {data.openLoops.tasks.slice(0, 5).map((task) => (
                  <motion.div
                    key={task.id}
                    className="flex items-center gap-2 text-sm text-slate-300 py-1.5 px-3 bg-void-50/30 rounded-lg border border-void-border"
                    whileHover={{ x: 2, borderColor: 'rgba(245, 158, 11, 0.3)' }}
                  >
                    <NeuralNode type="task" size="xs" />
                    <span>{task.title}</span>
                  </motion.div>
                ))}
              </div>
              {data.openLoops.total > 5 && (
                <SynapseButton
                  variant="secondary"
                  size="sm"
                  className="mt-4"
                  onClick={() => window.location.href = '/browse'}
                  iconRight={
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  }
                >
                  View all {data.openLoops.total} tasks
                </SynapseButton>
              )}
            </div>
          </motion.div>
        )}

        {/* Stale Projects */}
        {data && data.staleProjects.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <NeuralNode type="project" size="md" pulse color="rgba(245, 158, 11, 0.8)" />
              <h3 className="text-xl font-semibold text-white">Stale Projects</h3>
              <span className="text-sm text-warning">({data.staleProjects.total})</span>
            </div>
            <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-xl p-5">
              <p className="text-warning/80 text-sm mb-4">
                These projects haven't been updated in 14+ days. Consider reviewing them.
              </p>
              <div className="space-y-3">
                {data.staleProjects.projects.map((project) => (
                  <motion.div
                    key={project.id}
                    className="bg-void-50/50 rounded-lg border border-warning/20 p-4 hover:border-warning/40 hover:shadow-[0_0_15px_-4px_rgba(245,158,11,0.3)] transition-all duration-300"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <NeuralNode type="project" size="sm" />
                      <h4 className="font-medium text-white">{project.name}</h4>
                    </div>
                    {project.desiredOutcome && (
                      <p className="text-sm text-slate-400 mt-1 pl-6">{project.desiredOutcome}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-2 pl-6">
                      Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Context Questions */}
        {data && data.contextQuestions.total > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <NeuralNode type="person" size="md" />
              <h3 className="text-xl font-semibold text-white">Personal Context Questions</h3>
              <span className="text-sm text-entity-person">({data.contextQuestions.total})</span>
            </div>
            <div className="bg-gradient-to-br from-entity-person/10 to-entity-person/5 border border-entity-person/20 rounded-xl p-5">
              <p className="text-pink-400/80 text-sm mb-4">
                These people/places have been mentioned multiple times without descriptions.
              </p>
              <div className="space-y-3">
                {data.contextQuestions.questions.map((question) => (
                  <motion.div
                    key={question.contextId}
                    className="bg-void-50/50 rounded-lg border border-entity-person/20 p-4 hover:border-entity-person/40 hover:shadow-glow-person transition-all duration-300"
                    whileHover={{ x: 2 }}
                  >
                    <p className="text-sm font-medium text-white mb-2">{question.suggestedQuestion}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-entity-person/20 rounded-full text-pink-400">
                        {question.mentionCount}x mentioned
                      </span>
                      <span className="px-2 py-0.5 bg-void-100/50 rounded-full capitalize">
                        {question.type}
                      </span>
                      {question.domain && (
                        <span className="px-2 py-0.5 bg-void-100/50 rounded-full">
                          {question.domain}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Suggested Areas of Focus - AI Insights */}
        {data && data.suggestedFocus.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <NeuralNode type="idea" size="md" pulse />
              <h3 className="text-xl font-semibold text-white">Suggested Focus Areas</h3>
            </div>
            <div className="bg-gradient-to-br from-neural-memory-500/10 to-neural-memory-500/5 border border-neural-memory-500/20 rounded-xl p-5">
              <div className="space-y-3">
                {data.suggestedFocus.map((focus, index) => (
                  <motion.div
                    key={index}
                    className="bg-void-50/50 rounded-lg border border-neural-memory-500/20 p-4 hover:border-neural-memory-500/40 hover:shadow-glow-idea transition-all duration-300"
                    whileHover={{ x: 2 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <NeuralNode type="idea" size="sm" />
                        <h4 className="font-medium text-white">{focus.context}</h4>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-neural-fire-500/20 rounded-full text-neural-fire-400">
                        {focus.taskCount} tasks
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 pl-6">{focus.suggestion}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {data &&
         data.wins.totalTasks === 0 &&
         data.wins.totalProjects === 0 &&
         data.openLoops.total === 0 &&
         data.staleProjects.total === 0 &&
         data.contextQuestions.total === 0 &&
         data.suggestedFocus.length === 0 && (
          <motion.div
            className="bg-gradient-to-br from-void-50/60 to-void-100/80 rounded-xl border border-void-border p-12 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <NeuralNode type="idea" size="xl" pulse />
            </div>
            <p className="text-slate-300 text-lg mb-2">Your weekly review is empty</p>
            <p className="text-slate-500 text-sm">
              Start capturing thoughts and building your second brain!
            </p>
            <SynapseButton
              variant="primary"
              className="mt-6"
              onClick={() => window.location.href = '/capture'}
            >
              Capture your first thought
            </SynapseButton>
          </motion.div>
        )}
    </div>
  );
}
