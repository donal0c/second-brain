import { useState, useEffect, useCallback } from "react";
import { registerSW } from "virtual:pwa-register";

interface PWAState {
  needRefresh: boolean;
  offlineReady: boolean;
  updateServiceWorker: () => void;
  dismissUpdate: () => void;
}

export function usePWA(): PWAState {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [updateSW, setUpdateSW] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    if (!import.meta.env.PROD) {
      return;
    }

    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineReady(true);
        // Auto-dismiss offline ready message after 3 seconds
        setTimeout(() => setOfflineReady(false), 3000);
      },
      onRegistered(registration) {
        // Check for updates every hour
        if (registration) {
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000);
        }
      },
    });

    setUpdateSW(() => update);
  }, []);

  const updateServiceWorker = useCallback(() => {
    if (updateSW) {
      updateSW();
    }
  }, [updateSW]);

  const dismissUpdate = useCallback(() => {
    setNeedRefresh(false);
  }, []);

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
    dismissUpdate,
  };
}
