import { useState, useEffect } from "react";
import { inbox, type InboxItem, type ApiError } from "../lib/api";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700" },
  processing: { label: "Processing", color: "bg-yellow-100 text-yellow-700" },
  processed: { label: "Processed", color: "bg-green-100 text-green-700" },
  blocked: { label: "Needs Clarification", color: "bg-orange-100 text-orange-700" },
};

export function Inbox() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;

      const response = await inbox.list(params);
      setItems(response.items);
      setTotal(response.total);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || apiError.error || "Failed to load inbox items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
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
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inbox</h2>
          <p className="text-gray-600 mt-1">
            {total} item{total !== 1 ? "s" : ""} captured
          </p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
        >
          <option value="">All items</option>
          <option value="new">New</option>
          <option value="processing">Processing</option>
          <option value="processed">Processed</option>
          <option value="blocked">Needs Clarification</option>
        </select>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button
            onClick={loadItems}
            className="ml-2 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-100 rounded w-1/4"></div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">
            {statusFilter
              ? "No items with this status"
              : "Your inbox is empty. Capture something!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-gray-900 flex-1 whitespace-pre-wrap">
                  {item.rawText}
                </p>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    STATUS_LABELS[item.status]?.color || "bg-gray-100 text-gray-700"
                  }`}
                >
                  {STATUS_LABELS[item.status]?.label || item.status}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                <span>{formatDate(item.capturedAt)}</span>
                <span>via {item.source}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
