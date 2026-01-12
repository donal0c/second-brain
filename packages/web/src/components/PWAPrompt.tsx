import { usePWA } from "../hooks/usePWA";

export function PWAPrompt() {
  const { needRefresh, offlineReady, updateServiceWorker, dismissUpdate } = usePWA();

  if (!needRefresh && !offlineReady) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[100] animate-slide-up">
      {offlineReady && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl text-white text-sm font-semibold flex items-center gap-3 shadow-card">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          App ready to work offline
        </div>
      )}

      {needRefresh && (
        <div className="p-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-card">
          <div className="flex items-start gap-3">
            <span className="w-2 h-2 mt-1.5 bg-blue-400 rounded-full animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <p className="text-white text-sm font-semibold mb-3">
                A new version is available
              </p>
              <div className="flex gap-2">
                <button
                  onClick={updateServiceWorker}
                  className="px-4 py-2 bg-white text-gray-900 rounded-xl text-xs font-bold hover:bg-gray-100 transition-colors"
                >
                  Update now
                </button>
                <button
                  onClick={dismissUpdate}
                  className="px-4 py-2 text-gray-400 rounded-xl text-xs font-bold hover:text-white transition-colors"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
