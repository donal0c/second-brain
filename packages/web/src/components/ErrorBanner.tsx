export function ErrorBanner({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
      {error}
      {onRetry && (
        <button onClick={onRetry} className="ml-2 underline hover:no-underline font-medium text-rose-300">
          Retry
        </button>
      )}
    </div>
  );
}
