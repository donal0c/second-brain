import { useState, useEffect } from "react";
import { inbox, extractErrorMessage, type InboxItem } from "../lib/api";
import { useReprocessInboxItem } from "../lib/queries";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";

const STATUS_CONFIG: Record<string, { label: string; dotColor: string }> = {
  new: { label: "New", dotColor: "bg-primary-hover" },
  processing: { label: "Processing", dotColor: "bg-yellow-500" },
  processed: { label: "Processed", dotColor: "bg-green-500" },
  blocked: { label: "Needs Clarification", dotColor: "bg-orange-500" },
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
      // Reload items to get updated status
      await loadItems();
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 tracking-tight">Inbox</h2>
          <p className="text-sm text-gray-500 mt-1">
            {total} {total === 1 ? "item" : "items"} pending review
          </p>
        </div>

        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-subtle focus:border-primary-hover hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <option value="">All items</option>
            <option value="new">New</option>
            <option value="processing">Processing</option>
            <option value="processed">Processed</option>
            <option value="blocked">Needs Clarification</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </header>

      {error && <ErrorBanner error={error} onRetry={() => loadItems()} />}

      {loading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <div className="bg-white/50 rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            📥
          </div>
          <p className="text-gray-900 font-medium">Inbox Zero</p>
          <p className="text-gray-500 text-sm mt-1">
            {statusFilter
              ? "No items found with this status"
              : "You're all caught up! Capture something new to get started."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative bg-white rounded-xl p-4 shadow-sm ring-1 ring-gray-900/5 hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 ease-out cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-gray-900 text-sm leading-relaxed flex-1 whitespace-pre-wrap font-medium">
                  {item.rawText}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[item.status]?.dotColor || "bg-gray-300"}`} />
                  <span className="text-xs font-medium text-gray-500">
                    {STATUS_CONFIG[item.status]?.label || item.status}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-[11px] text-gray-400 font-medium uppercase tracking-wider">
                  <span>{formatDate(item.capturedAt)}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                  <span className="flex items-center gap-1">
                    {item.source}
                  </span>
                </div>
                {(item.status === "processed" || item.status === "blocked") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReprocess(item);
                    }}
                    disabled={reprocessingId === item.id}
                    className="text-xs font-medium text-primary-hover hover:text-primary-active disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {reprocessingId === item.id ? "Reprocessing..." : "Reprocess"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}