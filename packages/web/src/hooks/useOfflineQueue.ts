import { useState, useEffect, useCallback } from "react";
import { offlineQueue } from "../lib/offlineQueue";

export function useOfflineQueue() {
  const [queueCount, setQueueCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    // Initialize queue and get initial count
    offlineQueue
      .init()
      .then(() => offlineQueue.count())
      .then(setQueueCount)
      .catch(console.error);

    // Listen for queue changes
    const unsubscribe = offlineQueue.onChange(() => {
      offlineQueue
        .count()
        .then(setQueueCount)
        .catch(console.error);
    });

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addToQueue = useCallback(async (text: string): Promise<string> => {
    return offlineQueue.add(text);
  }, []);

  const syncQueue = useCallback(
    async (captureFunction: (text: string) => Promise<void>) => {
      await offlineQueue.sync(captureFunction);
    },
    []
  );

  return {
    queueCount,
    isOnline,
    addToQueue,
    syncQueue,
  };
}
