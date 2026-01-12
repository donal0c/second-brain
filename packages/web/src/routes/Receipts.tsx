import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { receipts, inbox, extractErrorMessage, type Receipt, type ReceiptListParams } from "../lib/api";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";
import { Modal } from "../components/Modal";

export function Receipts() {
  const [items, setItems] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inboxTexts, setInboxTexts] = useState<Record<string, string>>({});
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  // Filter state
  const [classificationFilter, setClassificationFilter] = useState<string>("");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  // Previous receipt for diff view
  const [previousReceipt, setPreviousReceipt] = useState<Receipt | null>(null);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  const loadReceipts = async (newOffset = 0, signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      // Build filter params
      const params: ReceiptListParams = { limit, offset: newOffset };
      if (classificationFilter) params.classification = classificationFilter;
      if (confidenceFilter) {
        const [min, max] = confidenceFilter.split("-").map(Number);
        if (!isNaN(min)) params.minConfidence = min;
        if (!isNaN(max)) params.maxConfidence = max;
      }
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await receipts.list(params, signal);
      setItems(response.items);
      setTotal(response.total);
      setOffset(newOffset);

      // Load the original inbox text for each receipt
      const texts: Record<string, string> = {};
      await Promise.all(
        response.items.map(async (r) => {
          if (!inboxTexts[r.inboxItemId]) {
            try {
              const inboxItem = await inbox.get(r.inboxItemId, signal);
              texts[r.inboxItemId] = inboxItem.rawText;
            } catch (error) {
              if (error instanceof Error && error.name === 'AbortError') {
                throw error;
              }
              texts[r.inboxItemId] = "(Could not load original text)";
            }
          }
        })
      );
      setInboxTexts((prev) => ({ ...prev, ...texts }));
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
    loadReceipts(0, controller.signal);
    return () => controller.abort();
  }, [classificationFilter, confidenceFilter, startDate, endDate]);

  // Load previous receipt when selected receipt has previousReceiptId
  useEffect(() => {
    if (!selectedReceipt?.previousReceiptId) {
      setPreviousReceipt(null);
      return;
    }

    const loadPrevious = async () => {
      setLoadingPrevious(true);
      try {
        const prev = await receipts.get(selectedReceipt.previousReceiptId!);
        setPreviousReceipt(prev);
      } catch {
        setPreviousReceipt(null);
      } finally {
        setLoadingPrevious(false);
      }
    };

    loadPrevious();
  }, [selectedReceipt?.previousReceiptId]);

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 bg-green-50";
    if (score >= 0.5) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getClassificationIcon = (classification: string) => {
    switch (classification) {
      case "task": return "T";
      case "project": return "P";
      case "idea": return "I";
      case "person": return "@";
      default: return "?";
    }
  };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "task": return "bg-primary-subtle text-primary-active";
      case "project": return "bg-purple-100 text-purple-700";
      case "idea": return "bg-amber-100 text-amber-700";
      case "person": return "bg-pink-100 text-pink-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  // Group receipts by date
  const groupedReceipts = items.reduce((acc, receipt) => {
    const date = formatDate(receipt.timestamp);
    if (!acc[date]) acc[date] = [];
    acc[date].push(receipt);
    return acc;
  }, {} as Record<string, Receipt[]>);

  const clearFilters = () => {
    setClassificationFilter("");
    setConfidenceFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = classificationFilter || confidenceFilter || startDate || endDate;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receipts</h2>
          <p className="text-gray-600 mt-1">
            {total} processing receipt{total !== 1 ? "s" : ""} - audit trail of all AI decisions
          </p>
        </div>
        <button
          onClick={() => loadReceipts(0)}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
        >
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Classification filter */}
          <div className="relative">
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-subtle focus:border-primary-hover hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <option value="">All types</option>
              <option value="task">Task</option>
              <option value="project">Project</option>
              <option value="idea">Idea</option>
              <option value="person">Person</option>
              <option value="unknown">Unknown</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {/* Confidence filter */}
          <div className="relative">
            <select
              value={confidenceFilter}
              onChange={(e) => setConfidenceFilter(e.target.value)}
              className="appearance-none pl-3 pr-8 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-subtle focus:border-primary-hover hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <option value="">All confidence</option>
              <option value="0.8-1">High (80%+)</option>
              <option value="0.5-0.8">Medium (50-80%)</option>
              <option value="0-0.5">Low (&lt;50%)</option>
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>

          {/* Date range filters */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-subtle focus:border-primary-hover"
              placeholder="Start date"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-subtle focus:border-primary-hover"
              placeholder="End date"
            />
          </div>

          {/* Clear filters button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {error && <ErrorBanner error={error} onRetry={() => loadReceipts(0)} />}

      {loading ? (
        <LoadingSkeleton />
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No receipts yet. Process some inbox items to see the audit trail.</p>
        </div>
      ) : (
        <>
          {/* Receipts grouped by date */}
          {Object.entries(groupedReceipts).map(([date, dateReceipts]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-500 sticky top-0 bg-gray-50 py-2 px-1">
                {date}
              </h3>
              {dateReceipts.map((receipt) => (
                <div
                  key={receipt.id}
                  onClick={() => setSelectedReceipt(receipt)}
                  className="bg-white rounded-lg border border-gray-200 p-4 cursor-pointer hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Original text preview */}
                      <p className="text-gray-900 truncate">
                        {inboxTexts[receipt.inboxItemId] || "Loading..."}
                      </p>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {/* Classification badge */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getClassificationColor(receipt.classification)}`}>
                          {getClassificationIcon(receipt.classification)} {receipt.classification}
                        </span>

                        {/* Confidence score */}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(receipt.confidenceScore)}`}>
                          {Math.round(receipt.confidenceScore * 100)}%
                        </span>

                        {/* Model */}
                        <span className="text-xs text-gray-400">
                          {receipt.modelUsed.split("/").pop()}
                        </span>

                        {/* Writes count */}
                        {receipt.writes.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {receipt.writes.length} write{receipt.writes.length !== 1 ? "s" : ""}
                          </span>
                        )}

                        {/* Personal context used */}
                        {receipt.personalContextUsed && receipt.personalContextUsed.length > 0 && (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                            +{receipt.personalContextUsed.length} context
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Time */}
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(receipt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={() => loadReceipts(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                {offset + 1}-{Math.min(offset + limit, total)} of {total}
              </span>
              <button
                onClick={() => loadReceipts(offset + limit)}
                disabled={offset + limit >= total}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Receipt Detail Modal */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title="Receipt Details"
      >
        {selectedReceipt && (
          <div className="space-y-4">
                {/* Original Text */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Original Capture</label>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {inboxTexts[selectedReceipt.inboxItemId] || "Loading..."}
                    </p>
                  </div>
                </div>

                {/* Classification & Confidence */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Classification</label>
                    <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${getClassificationColor(selectedReceipt.classification)}`}>
                      {selectedReceipt.classification}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Confidence</label>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${selectedReceipt.confidenceScore >= 0.8 ? "bg-green-500" : selectedReceipt.confidenceScore >= 0.5 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${selectedReceipt.confidenceScore * 100}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getConfidenceColor(selectedReceipt.confidenceScore)}`}>
                        {Math.round(selectedReceipt.confidenceScore * 100)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Extracted Fields */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Extracted Fields</label>
                  <pre className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 overflow-x-auto">
                    {JSON.stringify(selectedReceipt.extractedFields, null, 2)}
                  </pre>
                </div>

                {/* Writes */}
                {selectedReceipt.writes.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Database Writes</label>
                    <div className="space-y-2">
                      {selectedReceipt.writes.map((write, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${write.action === "create" ? "bg-green-100 text-green-700" : "bg-primary-subtle text-primary-active"}`}>
                            {write.action}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getClassificationColor(write.entityType)}`}>
                            {write.entityType}
                          </span>
                          <Link
                            to={`/browse?type=${write.entityType}&id=${write.entityId}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-primary-hover hover:underline font-mono"
                          >
                            {write.entityId}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Personal Context Used */}
                {selectedReceipt.personalContextUsed && selectedReceipt.personalContextUsed.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Personal Context Used</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedReceipt.personalContextUsed.map((ctx, i) => (
                        <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs">
                          {ctx}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Model</label>
                    <p className="text-sm text-gray-700">{selectedReceipt.modelUsed}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Timestamp</label>
                    <p className="text-sm text-gray-700">{formatTimestamp(selectedReceipt.timestamp)}</p>
                  </div>
                </div>

                {/* Diff View for Fix Receipts */}
                {selectedReceipt.previousReceiptId && (
                  <div className="pt-4 border-t border-gray-200">
                    <label className="block text-xs font-medium text-orange-600 mb-2">
                      This is a fix receipt - showing changes from previous
                    </label>
                    {loadingPrevious ? (
                      <div className="text-sm text-gray-500">Loading previous receipt...</div>
                    ) : previousReceipt ? (
                      <div className="bg-orange-50 rounded-lg p-3 space-y-3">
                        {/* Classification change */}
                        {previousReceipt.classification !== selectedReceipt.classification && (
                          <div className="text-sm">
                            <span className="font-medium text-gray-700">Classification: </span>
                            <span className="line-through text-red-600">{previousReceipt.classification}</span>
                            <span className="mx-2">→</span>
                            <span className="text-green-600">{selectedReceipt.classification}</span>
                          </div>
                        )}

                        {/* Extracted fields diff */}
                        <div>
                          <span className="text-xs font-medium text-gray-600">Field changes:</span>
                          <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-red-50 p-2 rounded">
                              <span className="text-red-700 font-medium">Previous:</span>
                              <pre className="mt-1 text-gray-700 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(previousReceipt.extractedFields, null, 2)}
                              </pre>
                            </div>
                            <div className="bg-green-50 p-2 rounded">
                              <span className="text-green-700 font-medium">Current:</span>
                              <pre className="mt-1 text-gray-700 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(selectedReceipt.extractedFields, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">Could not load previous receipt</div>
                    )}
                  </div>
                )}

                {/* IDs */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-xs font-medium text-gray-500 mb-1">IDs</label>
                  <div className="text-xs text-gray-500 font-mono space-y-1">
                    <p>Receipt: {selectedReceipt.id}</p>
                    <p>
                      Inbox Item:{" "}
                      <Link
                        to={`/inbox?id=${selectedReceipt.inboxItemId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-primary-hover hover:underline"
                      >
                        {selectedReceipt.inboxItemId}
                      </Link>
                    </p>
                    {selectedReceipt.previousReceiptId && (
                      <p>Previous Receipt: {selectedReceipt.previousReceiptId}</p>
                    )}
                  </div>
                </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
