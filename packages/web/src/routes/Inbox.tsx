import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { inbox, extractErrorMessage, type InboxItem } from "../lib/api";
import { useReprocessInboxItem } from "../lib/queries";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { NeuralNode, NeuralCard, SynapseButton } from "../components/ui/neural";

const STATUS_CONFIG: Record<string, { label: string; color: string; nodeType: "task" | "project" | "idea" | "person" }> = {
  new: { label: "New", color: "neural-memory", nodeType: "idea" },
  processing: { label: "Processing", color: "neural-fire", nodeType: "task" },
  processed: { label: "Processed", color: "success", nodeType: "project" },
  blocked: { label: "Needs Clarification", color: "warning", nodeType: "task" },
};

export function Inbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const reprocessMutation = useReprocessInboxItem();

  const loadItems = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const response = await inbox.list(params, signal);
      setItems(response.items);
      setTotal(response.total);
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
    loadItems(controller.signal);
    return () => controller.abort();
  }, [statusFilter]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleReprocess = async (item: InboxItem) => {
    const preview = item.rawText.length > 50
      ? item.rawText.substring(0, 50) + "..."
      : item.rawText;

    if (!window.confirm(`Reprocess "${preview}"? This will delete any existing entity and re-classify the item.`)) {
      return;
    }

    setReprocessingId(item.id);
    setError(null);

    try {
      await reprocessMutation.mutateAsync(item.id);
      await loadItems();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="p-6 md:p-8 min-h-full neural-bg">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-40 right-40 w-80 h-80 bg-neural-memory-500/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-20 left-40 w-60 h-60 bg-neural-pulse-500/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 space-y-6">
        <motion.header
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <h2 className="text-3xl font-bold text-white tracking-wide font-display">Inbox</h2>
            <p className="text-sm text-slate-400 mt-1">
              {total} {total === 1 ? "item" : "items"} pending review
            </p>
          </div>

          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none pl-4 pr-10 py-2.5 bg-void-50/50 border border-void-border rounded-neural text-sm font-medium text-white focus:outline-none focus:border-neural-memory-500/50 hover:bg-void-50 transition-colors cursor-pointer"
            >
              <option value="">All items</option>
              <option value="new">New</option>
              <option value="processing">Processing</option>
              <option value="processed">Processed</option>
              <option value="blocked">Needs Clarification</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </motion.header>

        {error && <ErrorBanner error={error} onRetry={() => loadItems()} />}

        {loading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <motion.div
            className="glass rounded-neural border border-dashed border-neural-memory-500/30 p-16 text-center"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <motion.div
              className="w-16 h-16 mx-auto mb-6 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <NeuralNode type="idea" size="xl" pulse />
            </motion.div>
            <p className="text-xl font-semibold text-white">Inbox Zero</p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto">
              {statusFilter
                ? "No items found with this status"
                : "You're all caught up! Your neural network is clear."}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {items.map((item, i) => {
                const config = STATUS_CONFIG[item.status] || { label: item.status, color: "slate", nodeType: "idea" as const };
                const isProcessing = item.status === "processing";

                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <NeuralCard
                      entityType={config.nodeType}
                      interactive
                      className={`${isProcessing ? "animate-neural-pulse" : ""}`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Status node */}
                        <div className="pt-1">
                          <NeuralNode
                            type={config.nodeType}
                            size="sm"
                            pulse={isProcessing}
                          />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm leading-relaxed whitespace-pre-wrap font-medium">
                            {item.rawText}
                          </p>

                          <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
                              <span>{formatDate(item.capturedAt)}</span>
                              <span className="w-1 h-1 rounded-full bg-slate-600" />
                              <span>{item.source}</span>
                            </div>

                            {(item.status === "processed" || item.status === "blocked") && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReprocess(item);
                                }}
                                disabled={reprocessingId === item.id}
                                className="text-xs font-semibold text-neural-memory-400 hover:text-neural-memory-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {reprocessingId === item.id ? "Reprocessing..." : "Reprocess"}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="shrink-0">
                          <span className={`
                            px-2.5 py-1 rounded-full text-xs font-semibold
                            ${item.status === "new" ? "bg-neural-memory-500/20 text-neural-memory-400 border border-neural-memory-500/30" :
                              item.status === "processing" ? "bg-neural-fire-500/20 text-neural-fire-400 border border-neural-fire-500/30" :
                              item.status === "processed" ? "bg-success/20 text-success border border-success/30" :
                              "bg-warning/20 text-warning border border-warning/30"
                            }
                          `}>
                            {config.label}
                          </span>
                        </div>
                      </div>
                    </NeuralCard>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
