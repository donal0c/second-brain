import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { search, extractErrorMessage, type SearchResult, type Task, type Project, type Idea } from "../lib/api";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { ErrorBanner } from "../components/ErrorBanner";

export function Search() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  // Filter states
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [typeFilter, setTypeFilter] = useState<"task" | "project" | "idea" | "">("");
  const [statusFilter, setStatusFilter] = useState("");
  const [contextFilter, setContextFilter] = useState("");
  const [searchTrigger, setSearchTrigger] = useState(0);

  // Perform search when query parameter changes
  useEffect(() => {
    const q = searchParams.get("q");
    if (q) {
      setQuery(q);
    }
  }, [searchParams]);

  // Debounce query changes (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Perform search when debounced query or filters change
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setTotal(0);
      setError(null);
      return;
    }

    const controller = new AbortController();

    const performSearch = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await search.query(
          {
            q: debouncedQuery,
            type: typeFilter || undefined,
            status: statusFilter || undefined,
            context: contextFilter || undefined,
          },
          controller.signal
        );

        setResults(response.results);
        setTotal(response.total);
      } catch (err) {
        // Ignore AbortError - this is expected when the effect is cleaned up
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        setError(extractErrorMessage(err));
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    performSearch();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, typeFilter, statusFilter, contextFilter, searchTrigger]);

  const handleQuerySubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      // Immediately trigger search on form submit (bypass debounce)
      setDebouncedQuery(query);
      setSearchTrigger((t) => t + 1);
    }
  };

  const getEntityIcon = (type: string) => {
    switch (type) {
      case "task":
        return "✓";
      case "project":
        return "📁";
      case "idea":
        return "💡";
      default:
        return "•";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/20 text-green-400";
      case "completed":
        return "bg-slate-700/50 text-slate-400";
      case "waiting":
      case "on_hold":
        return "bg-yellow-500/20 text-yellow-400";
      case "someday":
        return "bg-indigo-500/20 text-indigo-400";
      default:
        return "bg-slate-700/50 text-slate-400";
    }
  };

  const handleResultClick = (result: SearchResult) => {
    // Navigate to Browse page with the entity type selected
    navigate(`/browse?type=${result.type}&id=${result.id}`);
  };

  return (
    <div className="p-6 md:p-8 min-h-full space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white font-display mb-4">Search</h2>

        {/* Search Form */}
        <form onSubmit={handleQuerySubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, projects, ideas..."
              data-testid="search-page-input"
              className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            >
              <option value="">All Types</option>
              <option value="task">Tasks</option>
              <option value="project">Projects</option>
              <option value="idea">Ideas</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="waiting">Waiting</option>
              <option value="on_hold">On Hold</option>
              <option value="someday">Someday</option>
            </select>
          </div>

          <div>
            <input
              type="text"
              value={contextFilter}
              onChange={(e) => setContextFilter(e.target.value)}
              placeholder="Filter by context"
              className="px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50"
            />
          </div>

          {(typeFilter || statusFilter || contextFilter) && (
            <button
              onClick={() => {
                setTypeFilter("");
                setStatusFilter("");
                setContextFilter("");
              }}
              className="px-3 py-2 text-sm text-slate-400 hover:text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      {!loading && query && (
        <div className="text-sm text-slate-400">
          {total === 0 ? "No results found" : `Found ${total} result${total !== 1 ? "s" : ""}`}
        </div>
      )}

      {/* Error Message */}
      {error && <ErrorBanner error={error} />}

      {/* Loading State */}
      {loading && <LoadingSkeleton />}

      {/* Results List */}
      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((result) => {
            const entity = result.entity as Task | Project | Idea;
            return (
              <div
                key={`${result.type}-${result.id}`}
                onClick={() => handleResultClick(result)}
                data-testid="search-result"
                className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4 cursor-pointer hover:border-slate-600 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{getEntityIcon(result.type)}</span>
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div
                          className="text-base font-medium text-white mb-1"
                          dangerouslySetInnerHTML={{ __html: result.snippet.title }}
                        />
                        <div
                          className="text-sm text-slate-400"
                          dangerouslySetInnerHTML={{ __html: result.snippet.content }}
                        />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
                          {result.type}
                        </span>
                        {"status" in entity && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(entity.status)}`}>
                            {entity.status.replace("_", " ")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Additional metadata */}
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      {result.type === "task" && (entity as Task).context && (
                        <span className="px-2 py-0.5 bg-slate-700/50 rounded">
                          {(entity as Task).context}
                        </span>
                      )}
                      <span>
                        {new Date(entity.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && query && results.length === 0 && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-8 text-center text-slate-400">
          <p className="mb-2">No results found for "{query}"</p>
          <p className="text-sm">Try adjusting your search query or filters</p>
        </div>
      )}

      {/* Initial State */}
      {!query && !loading && (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-8 text-center text-slate-400">
          <p>Enter a search query to find tasks, projects, and ideas</p>
        </div>
      )}
    </div>
  );
}
