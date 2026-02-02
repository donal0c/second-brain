import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { digest } from "../lib/api";
import { NeuralNode } from "./ui/neural";
import { useGenerativeUI } from "../hooks/useGenerativeUI";

const navItems = [
  { to: "/capture", label: "Capture", icon: "plus", entityType: "idea" as const },
  { to: "/inbox", label: "Inbox", icon: "inbox", entityType: "project" as const },
  { to: "/today", label: "Today", icon: "calendar", entityType: "task" as const },
  { to: "/digest/dashboard", label: "Digest", icon: "chart", entityType: "idea" as const },
  { to: "/browse", label: "Browse", icon: "folder", entityType: "project" as const },
];

const secondaryItems = [
  { to: "/clarifications", label: "Clarify", icon: "help" },
  { to: "/receipts", label: "Receipts", icon: "receipt" },
  { to: "/stream-demo", label: "Stream", icon: "spark" },
];

function Icon({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    "plus": "M12 4v16m8-8H4",
    "inbox": "M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4",
    "calendar": "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    "chart": "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z",
    "folder": "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z",
    "help": "M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    "receipt": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    "search": "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
    "menu": "M4 6h16M4 12h16M4 18h16",
    "close": "M6 18L18 6M6 6l12 12",
    "spark": "M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z"
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingClarifications, setPendingClarifications] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const { enabled: genUiEnabled, setEnabled: setGenUiEnabled } = useGenerativeUI();

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summary = await digest.summary();
        setPendingClarifications(summary.pendingClarifications);
      } catch {
        // Silently fail - badge just won't show
      }
    };
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSidebarOpen(false);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-void-200 font-sans antialiased text-slate-200 overflow-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-void-100/80 backdrop-blur-xl border-b border-void-border flex items-center justify-between px-4 md:hidden z-40">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 bg-gradient-to-br from-neural-memory-500 to-neural-pulse-600 rounded-xl blur-sm opacity-70" />
            <div className="relative w-full h-full bg-void-100 rounded-xl border border-void-border flex items-center justify-center">
              <span className="text-base">🧠</span>
            </div>
          </div>
          <span className="font-bold text-base tracking-tight text-white font-display">Second Brain</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-void-50 transition-colors"
          aria-label="Open menu"
        >
          <Icon name="menu" className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-void-300/80 backdrop-blur-sm z-40 md:hidden"
            onClick={closeSidebar}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72
        bg-void-100/70 backdrop-blur-xl border-r border-void-border
        flex flex-col flex-shrink-0
        transform transition-transform duration-300 ease-neural
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* Sidebar ambient glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 -left-20 w-60 h-60 bg-neural-memory-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-20 -left-10 w-40 h-40 bg-neural-pulse-500/10 rounded-full blur-[60px]" />
        </div>

        {/* Logo */}
        <div className="relative z-10 p-6 h-20 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="relative w-9 h-9 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              {/* Glow ring */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-neural-memory-500 via-neural-pulse-500 to-neural-fire-500 rounded-xl blur-sm"
                initial={{ opacity: 0.5 }}
                whileHover={{ opacity: 1 }}
                animate={{
                  opacity: [0.5, 0.7, 0.5],
                }}
                transition={{
                  opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                }}
              />
              <div className="relative w-full h-full bg-void-100 rounded-xl border border-neural-memory-500/30 flex items-center justify-center overflow-hidden">
                <span className="text-lg">🧠</span>
              </div>
            </motion.div>
            <span className="font-bold text-lg tracking-tight text-white font-display">Second Brain</span>
          </motion.div>
          <button
            onClick={closeSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-void-50 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative z-10 px-6 mb-6">
          <form onSubmit={handleSearch} className="relative group">
            <motion.div
              className="absolute inset-0 rounded-neural pointer-events-none"
              animate={{
                boxShadow: searchFocused
                  ? '0 0 0 2px rgba(139, 92, 246, 0.2), 0 0 20px -4px rgba(139, 92, 246, 0.3)'
                  : 'none'
              }}
              transition={{ duration: 0.2 }}
            />
            <Icon name="search" className={`absolute left-3 top-3 w-4 h-4 transition-colors ${searchFocused ? 'text-neural-memory-400' : 'text-slate-500'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search anything..."
              data-testid="global-search-input"
              className="relative z-10 w-full bg-slate-800/80 border border-void-border rounded-neural py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-neural-memory-500/50 transition-all"
              style={{ color: '#ffffff' }}
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 p-1.5 rounded-lg text-slate-500 hover:text-neural-memory-400 hover:bg-void-50 transition-colors"
              aria-label="Search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>
        </div>

        {/* Navigation */}
        <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4 space-y-6 scrollbar-neural">
          <nav className="space-y-1">
            {navItems.map((item, i) => (
              <motion.div
                key={item.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05, duration: 0.4 }}
              >
                <NavLink
                  to={item.to}
                  onClick={closeSidebar}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-neural text-sm font-semibold transition-all duration-neural group relative ${
                      isActive
                        ? "bg-neural-memory-500/15 text-white border border-neural-memory-500/30 shadow-neural-sm"
                        : "text-slate-400 hover:text-white hover:bg-void-50/50 border border-transparent"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {/* Neural node indicator */}
                      <div className="relative">
                        <Icon name={item.icon} className={`w-5 h-5 transition-colors ${isActive ? 'text-neural-memory-400' : 'text-slate-500 group-hover:text-neural-memory-400'}`} />
                        {isActive && (
                          <motion.div
                            className="absolute -inset-1 bg-neural-memory-500/20 rounded-full blur-sm"
                            layoutId="navGlow"
                            transition={{ type: "spring", stiffness: 350, damping: 30 }}
                          />
                        )}
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {isActive && (
                        <motion.div
                          layoutId="activeIndicator"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        >
                          <NeuralNode type="idea" size="xs" pulse />
                        </motion.div>
                      )}
                    </>
                  )}
                </NavLink>
              </motion.div>
            ))}
          </nav>

          {/* System section */}
          <div>
            <div className="px-4 mb-3 text-[10px] font-bold text-slate-600 uppercase tracking-[0.2em]">
              System
            </div>
            <nav className="space-y-1">
              {secondaryItems.map((item, i) => {
                const showBadge = item.to === "/clarifications" && pendingClarifications > 0;
                return (
                  <motion.div
                    key={item.to}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05, duration: 0.4 }}
                  >
                    <NavLink
                      to={item.to}
                      onClick={closeSidebar}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-neural text-sm font-semibold transition-all duration-neural group ${
                          isActive
                            ? "bg-neural-memory-500/15 text-white border border-neural-memory-500/30"
                            : "text-slate-400 hover:text-white hover:bg-void-50/50 border border-transparent"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <Icon name={item.icon} className={`w-5 h-5 transition-colors ${isActive ? 'text-neural-memory-400' : 'text-slate-500 group-hover:text-neural-memory-400'}`} />
                          <span className="flex-1">{item.label}</span>
                          {showBadge && (
                            <motion.span
                              className="bg-gradient-to-r from-neural-fire-500 to-neural-fire-600 text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 shadow-glow-task"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 500, damping: 25 }}
                            >
                              {pendingClarifications}
                            </motion.span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </nav>
            <div className="mt-3 px-4 py-3 rounded-neural border border-void-border bg-void-50/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Generative UI
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Toggle AI-selected views
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={genUiEnabled}
                    onChange={(event) => setGenUiEnabled(event.target.checked)}
                  />
                  <span className="w-10 h-5 bg-void-100/70 border border-void-border rounded-full peer-checked:bg-neural-memory-500/40 peer-checked:border-neural-memory-500/40 transition-colors" />
                  <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-500 transition-transform peer-checked:translate-x-5 peer-checked:bg-neural-memory-400" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* User Profile */}
        <motion.div
          className="relative z-10 p-4 border-t border-void-border"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <motion.div
            className="flex items-center justify-between p-3 bg-void-50/30 border border-void-border rounded-2xl hover:bg-void-50/50 hover:border-neural-memory-500/30 transition-all cursor-pointer group"
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              {/* Avatar with neural ring */}
              <div className="relative">
                <motion.div
                  className="absolute -inset-0.5 bg-gradient-to-br from-neural-memory-500 via-neural-pulse-500 to-neural-fire-500 rounded-full opacity-50 group-hover:opacity-100 transition-opacity"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                />
                <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-neural-memory-600 to-neural-pulse-600 flex items-center justify-center text-[11px] font-bold text-white">
                  DO
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Donal O'C.</p>
                <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">Pro Plan</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-600 group-hover:text-neural-memory-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </motion.div>
        </motion.div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 bg-void-200">
        <Outlet />
      </main>
    </div>
  );
}
