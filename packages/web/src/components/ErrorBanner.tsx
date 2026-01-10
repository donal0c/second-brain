export function ErrorBanner({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) {
  return (
    <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700">
      {error}
      {onRetry && (
        <button onClick={onRetry} className="ml-2 underline hover:no-underline font-medium">
          Retry
        </button>
      )}
    </div>
  );
}
