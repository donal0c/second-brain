// Offline queue for storing captures when offline and syncing when back online

const DB_NAME = "second-brain-offline";
const DB_VERSION = 1;
const STORE_NAME = "pending-captures";
const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 30 * 1000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;

interface QueuedCapture {
  id: string;
  text: string;
  timestamp: number;
  retries: number;
  nextAttemptAt?: number;
}

class OfflineQueue {
  private db: IDBDatabase | null = null;
  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }

  async add(text: string): Promise<string> {
    if (!this.db) await this.init();

    const capture: QueuedCapture = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      text,
      timestamp: Date.now(),
      retries: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(capture);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve(capture.id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<QueuedCapture[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async update(capture: QueuedCapture): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(capture);

      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  async count(): Promise<number> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async sync(captureFunction: (text: string) => Promise<void>): Promise<void> {
    if (this.syncInProgress) return;
    if (!navigator.onLine) return;

    this.syncInProgress = true;

    try {
      const captures = await this.getAll();

      const now = Date.now();
      for (const capture of captures) {
        if (capture.nextAttemptAt && now < capture.nextAttemptAt) {
          continue;
        }
        try {
          await captureFunction(capture.text);
          await this.remove(capture.id);
        } catch (error) {
          // If sync fails, we'll try again later
          console.error("Failed to sync capture:", error);
          const nextRetries = (capture.retries ?? 0) + 1;
          const backoff = Math.min(BASE_BACKOFF_MS * Math.pow(2, nextRetries - 1), MAX_BACKOFF_MS);
          const nextAttemptAt = Date.now() + backoff;
          const updatedCapture = {
            ...capture,
            retries: nextRetries,
            nextAttemptAt,
          };
          await this.update(updatedCapture);
          if (nextRetries >= MAX_RETRIES) {
            console.error(`Capture ${capture.id} reached max retries (${MAX_RETRIES}). Will retry later.`);
          }
        }
      }
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

export const offlineQueue = new OfflineQueue();

// Note: Auto-sync when coming back online is handled by useOfflineQueue hook consumers
// (e.g., Capture.tsx) which call syncQueue() when isOnline becomes true
