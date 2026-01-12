import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { App } from "./App";
import "./index.css";

// Register service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // New content available, prompt user or auto-refresh
    console.log("[PWA] New content available, will update on next refresh");
  },
  onOfflineReady() {
    console.log("[PWA] App ready to work offline");
  },
  onRegistered(registration) {
    console.log("[PWA] Service worker registered:", registration);
  },
  onRegisterError(error) {
    console.error("[PWA] Service worker registration error:", error);
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
