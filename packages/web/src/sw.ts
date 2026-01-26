/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { BackgroundSyncPlugin } from "workbox-background-sync";

declare let self: ServiceWorkerGlobalScope;

// API base URL from environment - injected at build time by Vite
// This enables SW caching for cross-origin API requests when API is hosted elsewhere
// Default must match the client default in lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";
const API_ORIGIN = new URL(API_BASE, self.location.origin).origin;

// Helper to check if a request URL matches the API origin
function isApiRequest(url: URL): boolean {
  // Match same-origin /api/* or /inbox paths
  if (url.origin === self.location.origin) {
    return url.pathname.startsWith("/api/") || url.pathname.startsWith("/inbox");
  }
  // Match cross-origin API requests to configured API_ORIGIN
  return url.origin === API_ORIGIN;
}

// Clean up old caches
cleanupOutdatedCaches();

// Precache all assets built by Vite
precacheAndRoute(self.__WB_MANIFEST);

// Background sync queue for offline captures
const bgSyncPlugin = new BackgroundSyncPlugin("capture-queue", {
  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
  onSync: async ({ queue }) => {
    let entry;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        console.log("[SW] Background sync: successfully replayed request");
      } catch (error) {
        console.error("[SW] Background sync: replay failed, re-queuing", error);
        await queue.unshiftRequest(entry);
        throw error; // Re-throw to signal failure
      }
    }
    console.log("[SW] Background sync complete");
  },
});

// Cache API responses with NetworkFirst strategy
// Falls back to cache when offline, but keeps cache short to avoid stale data
// Supports both same-origin and cross-origin API requests (via VITE_API_URL)
registerRoute(
  ({ url }) => isApiRequest(url),
  new NetworkFirst({
    cacheName: "api-cache",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 60 * 5, // 5 minutes
      }),
    ],
    networkTimeoutSeconds: 5,
  }),
  "GET"
);

// Handle POST requests to /inbox with background sync
// Supports both same-origin and cross-origin API requests
registerRoute(
  ({ url, request }) => {
    if (request.method !== "POST") return false;
    // Same-origin: match /inbox path
    if (url.origin === self.location.origin) {
      return url.pathname === "/inbox" || url.pathname.endsWith("/inbox");
    }
    // Cross-origin: match configured API origin + /inbox path
    return url.origin === API_ORIGIN && url.pathname === "/inbox";
  },
  new NetworkFirst({
    cacheName: "inbox-posts",
    plugins: [bgSyncPlugin],
  }),
  "POST"
);

// Cache static assets with CacheFirst strategy
registerRoute(
  ({ request }) =>
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "worker",
  new CacheFirst({
    cacheName: "static-assets",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Cache images with StaleWhileRevalidate
registerRoute(
  ({ request }) => request.destination === "image",
  new StaleWhileRevalidate({
    cacheName: "images",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
      }),
    ],
  })
);

// Cache fonts with CacheFirst
registerRoute(
  ({ request }) => request.destination === "font",
  new CacheFirst({
    cacheName: "fonts",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
      }),
    ],
  })
);

// Handle navigation requests (app shell)
registerRoute(
  ({ request }) => request.mode === "navigate",
  new NetworkFirst({
    cacheName: "pages",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24, // 24 hours
      }),
    ],
    networkTimeoutSeconds: 3,
  })
);

// Listen for skip waiting message
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// Notify clients when a sync event occurs
self.addEventListener("sync", (event) => {
  console.log("[SW] Sync event received:", event.tag);
});

// Handle offline fallback for navigation
self.addEventListener("fetch", (event) => {
  // Let workbox handle most requests
  // This is just for logging offline status
  if (!navigator.onLine) {
    console.log("[SW] Offline - handling request:", event.request.url);
  }
});

console.log("[SW] Service worker initialized with background sync support");
console.log(`[SW] API origin configured: ${API_ORIGIN}`);
