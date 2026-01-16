// =============================================================================
// Offline Queue Sync Behavior Tests
// =============================================================================
// Run with: npx tsx packages/web/src/lib/offlineQueue.test.ts
//
// These tests verify the offline queue sync behavior:
// - Queue operations (add, remove, getAll, count)
// - Sync behavior (online/offline, concurrent sync prevention)
// - Listener notifications

// =============================================================================
// Mock IndexedDB
// =============================================================================

interface QueuedCapture {
  id: string;
  text: string;
  timestamp: number;
  retries: number;
}

// In-memory mock store
let mockStore: Map<string, QueuedCapture> = new Map();

// Mock IDBRequest
class MockIDBRequest<T> {
  result: T;
  error: DOMException | null = null;
  onsuccess: ((event: Event) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(result: T) {
    this.result = result;
    // Trigger success asynchronously
    setTimeout(() => {
      if (this.onsuccess) {
        this.onsuccess(new Event("success"));
      }
    }, 0);
  }

  static withError<T>(error: DOMException): MockIDBRequest<T> {
    const req = new MockIDBRequest<T>(undefined as T);
    req.error = error;
    setTimeout(() => {
      if (req.onerror) {
        req.onerror(new Event("error"));
      }
    }, 0);
    return req;
  }
}

// Mock IDBObjectStore
class MockIDBObjectStore {
  name = "pending-captures";
  keyPath = "id";

  add(value: QueuedCapture): MockIDBRequest<IDBValidKey> {
    mockStore.set(value.id, value);
    return new MockIDBRequest<IDBValidKey>(value.id);
  }

  delete(key: string): MockIDBRequest<undefined> {
    mockStore.delete(key);
    return new MockIDBRequest<undefined>(undefined);
  }

  getAll(): MockIDBRequest<QueuedCapture[]> {
    return new MockIDBRequest<QueuedCapture[]>(Array.from(mockStore.values()));
  }

  count(): MockIDBRequest<number> {
    return new MockIDBRequest<number>(mockStore.size);
  }
}

// Mock IDBTransaction
class MockIDBTransaction {
  objectStore(): MockIDBObjectStore {
    return new MockIDBObjectStore();
  }
}

// Mock IDBDatabase
class MockIDBDatabase {
  objectStoreNames = { contains: () => true };

  transaction(): MockIDBTransaction {
    return new MockIDBTransaction();
  }

  createObjectStore(): MockIDBObjectStore {
    return new MockIDBObjectStore();
  }
}

// Mock IDBOpenDBRequest
class MockIDBOpenDBRequest extends MockIDBRequest<IDBDatabase> {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null;

  constructor() {
    super(new MockIDBDatabase() as unknown as IDBDatabase);
  }
}

// Mock indexedDB global
const mockIndexedDB = {
  open: (): MockIDBOpenDBRequest => new MockIDBOpenDBRequest(),
};

// Set up global mocks
(globalThis as Record<string, unknown>).indexedDB = mockIndexedDB;

// Mock navigator.onLine
let mockOnlineStatus = true;
Object.defineProperty(globalThis, "navigator", {
  value: {
    get onLine() {
      return mockOnlineStatus;
    },
  },
  writable: true,
});

// =============================================================================
// Test Implementation (inline version of OfflineQueue for testing)
// =============================================================================

class TestOfflineQueue {
  private db: MockIDBDatabase | null = null;
  private syncInProgress = false;
  private listeners: Set<() => void> = new Set();

  async init(): Promise<void> {
    return new Promise((resolve) => {
      const request = mockIndexedDB.open();
      request.onsuccess = () => {
        this.db = request.result as unknown as MockIDBDatabase;
        resolve();
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
      const transaction = this.db!.transaction();
      const store = transaction.objectStore();
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
      const transaction = this.db!.transaction();
      const store = transaction.objectStore();
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async remove(id: string): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction();
      const store = transaction.objectStore();
      const request = store.delete(id);

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
      const transaction = this.db!.transaction();
      const store = transaction.objectStore();
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async sync(captureFunction: (text: string) => Promise<void>): Promise<void> {
    if (this.syncInProgress) return;
    if (!mockOnlineStatus) return;

    this.syncInProgress = true;

    try {
      const captures = await this.getAll();

      for (const capture of captures) {
        try {
          await captureFunction(capture.text);
          await this.remove(capture.id);
        } catch {
          // If sync fails, we'll try again later
          console.error("Failed to sync capture");
        }
      }
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  isSyncing(): boolean {
    return this.syncInProgress;
  }

  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }

  // For testing
  reset(): void {
    this.db = null;
    this.syncInProgress = false;
    this.listeners.clear();
  }
}

// =============================================================================
// Test Runner
// =============================================================================

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`✓ ${name}`);
    passed++;
  } catch (error) {
    console.log(`✗ ${name}`);
    console.log(`  Error: ${error instanceof Error ? error.message : error}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

// =============================================================================
// Queue Basic Operations Tests
// =============================================================================

async function runTests() {
  console.log("\n--- Offline Queue Sync Behavior Tests ---\n");

  // Reset before each test
  const queue = new TestOfflineQueue();

  await test("add: should add capture to queue", async () => {
    queue.reset();
    mockStore.clear();

    const id = await queue.add("Test capture");
    assert(id !== undefined, "Should return an ID");
    assert(id.length > 0, "ID should not be empty");

    const captures = await queue.getAll();
    assertEqual(captures.length, 1, "Queue should have one item");
    assertEqual(captures[0].text, "Test capture", "Text should match");
  });

  await test("add: should generate unique IDs", async () => {
    queue.reset();
    mockStore.clear();

    const id1 = await queue.add("Capture 1");
    const id2 = await queue.add("Capture 2");
    assert(id1 !== id2, "IDs should be unique");
  });

  await test("getAll: should return all queued captures", async () => {
    queue.reset();
    mockStore.clear();

    await queue.add("Capture A");
    await queue.add("Capture B");
    await queue.add("Capture C");

    const captures = await queue.getAll();
    assertEqual(captures.length, 3, "Should return 3 captures");
  });

  await test("remove: should remove capture from queue", async () => {
    queue.reset();
    mockStore.clear();

    const id = await queue.add("To be removed");
    assertEqual(await queue.count(), 1, "Should have 1 item before removal");

    await queue.remove(id);
    assertEqual(await queue.count(), 0, "Should have 0 items after removal");
  });

  await test("count: should return correct count", async () => {
    queue.reset();
    mockStore.clear();

    assertEqual(await queue.count(), 0, "Empty queue should return 0");

    await queue.add("Item 1");
    assertEqual(await queue.count(), 1, "Should return 1 after adding");

    await queue.add("Item 2");
    assertEqual(await queue.count(), 2, "Should return 2 after adding");
  });

  // =============================================================================
  // Sync Behavior Tests
  // =============================================================================

  await test("sync: should process all captures when online", async () => {
    queue.reset();
    mockStore.clear();
    mockOnlineStatus = true;

    await queue.add("Sync capture 1");
    await queue.add("Sync capture 2");

    const syncedTexts: string[] = [];
    await queue.sync(async (text) => {
      syncedTexts.push(text);
    });

    assertEqual(syncedTexts.length, 2, "Should sync 2 captures");
    assertEqual(await queue.count(), 0, "Queue should be empty after sync");
  });

  await test("sync: should skip when offline", async () => {
    queue.reset();
    mockStore.clear();
    mockOnlineStatus = false;

    await queue.add("Offline capture");

    let syncCalled = false;
    await queue.sync(async () => {
      syncCalled = true;
    });

    assertEqual(syncCalled, false, "Sync should not be called when offline");
    assertEqual(await queue.count(), 1, "Queue should still have item");

    // Reset to online for other tests
    mockOnlineStatus = true;
  });

  await test("sync: should prevent concurrent syncs", async () => {
    queue.reset();
    mockStore.clear();
    mockOnlineStatus = true;

    await queue.add("Concurrent test");

    let syncCount = 0;

    // Start first sync (will be slow)
    const sync1 = queue.sync(async () => {
      syncCount++;
      // Simulate slow sync
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    // Start second sync while first is running
    const sync2 = queue.sync(async () => {
      syncCount++;
    });

    await Promise.all([sync1, sync2]);

    // Only first sync should execute since syncInProgress blocks the second
    assertEqual(syncCount, 1, "Only one sync should execute");
  });

  await test("sync: should keep item on sync failure", async () => {
    queue.reset();
    mockStore.clear();
    mockOnlineStatus = true;

    const id = await queue.add("Failed sync");

    await queue.sync(async () => {
      throw new Error("Sync failed");
    });

    // Item should remain in queue after failed sync
    assertEqual(await queue.count(), 1, "Item should remain after failed sync");
  });

  // =============================================================================
  // Listener Tests
  // =============================================================================

  await test("onChange: should register and call listeners", async () => {
    queue.reset();
    mockStore.clear();

    let notificationCount = 0;
    queue.onChange(() => {
      notificationCount++;
    });

    await queue.add("Listener test");
    assertEqual(notificationCount, 1, "Should notify on add");

    const id = await queue.add("Another");
    assertEqual(notificationCount, 2, "Should notify on second add");

    await queue.remove(id);
    assertEqual(notificationCount, 3, "Should notify on remove");
  });

  await test("onChange: should return unsubscribe function", async () => {
    queue.reset();
    mockStore.clear();

    let count = 0;
    const unsubscribe = queue.onChange(() => {
      count++;
    });

    await queue.add("Before unsubscribe");
    assertEqual(count, 1, "Should be called before unsubscribe");

    unsubscribe();

    await queue.add("After unsubscribe");
    assertEqual(count, 1, "Should not be called after unsubscribe");
  });

  await test("onChange: should notify after sync completes", async () => {
    queue.reset();
    mockStore.clear();
    mockOnlineStatus = true;

    await queue.add("Sync notify test");

    let notifyDuringSync = false;
    let notifyAfterSync = false;

    queue.onChange(() => {
      if (queue.isSyncing()) {
        notifyDuringSync = true;
      } else {
        notifyAfterSync = true;
      }
    });

    await queue.sync(async () => {});

    // The final notification happens after syncInProgress is set to false
    assertEqual(notifyAfterSync, true, "Should notify after sync completes");
  });

  // =============================================================================
  // Edge Cases
  // =============================================================================

  await test("init: should be idempotent (multiple inits)", async () => {
    queue.reset();
    mockStore.clear();

    await queue.init();
    await queue.init();
    await queue.init();

    await queue.add("After multiple inits");
    assertEqual(await queue.count(), 1, "Should work after multiple inits");
  });

  await test("operations: should auto-init if not initialized", async () => {
    queue.reset();
    mockStore.clear();

    // Don't call init explicitly
    await queue.add("Auto-init test");
    assertEqual(await queue.count(), 1, "Should auto-init and add");
  });

  // =============================================================================
  // Summary
  // =============================================================================

  console.log("\n" + "=".repeat(50));
  console.log(`Tests: ${passed} passed, ${failed} failed`);
  console.log("=".repeat(50));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error);
