export function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 animate-pulse"
        >
          <div className="h-4 bg-slate-700 rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-slate-700/50 rounded w-1/2"></div>
        </div>
      ))}
    </div>
  );
}

export function LoadingSkeletonLarge({ count = 2 }: { count?: number }) {
  return (
    <div className="space-y-6 animate-fade-in">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse space-y-4">
          <div className="h-32 bg-slate-800/50 rounded-xl"></div>
          <div className="h-64 bg-slate-800/50 rounded-xl"></div>
        </div>
      ))}
    </div>
  );
}
