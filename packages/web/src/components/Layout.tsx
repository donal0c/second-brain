import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { digest } from "../lib/api";

const navItems = [
  { to: "/capture", label: "Capture", icon: "plus" },
  { to: "/inbox", label: "Inbox", icon: "inbox" },
  { to: "/today", label: "Today", icon: "calendar" },
  { to: "/digest/dashboard", label: "Digest", icon: "chart" },
  { to: "/browse", label: "Browse", icon: "folder" },
];

const secondaryItems = [
  { to: "/clarifications", label: "Clarify", icon: "help" },
  { to: "/receipts", label: "Receipts", icon: "receipt" },
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
    "close": "M6 18L18 6M6 6l12 12"
  };

  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d={paths[name]} />
    </svg>
  );
}

export function Layout() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingClarifications, setPendingClarifications] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div data-design-version="v5-dark" className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 font-sans antialiased text-white overflow-hidden">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 flex items-center justify-between px-4 md:hidden z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-black shadow-lg shadow-indigo-500/30">S</div>
          <span className="font-bold text-base tracking-tight text-white font-display">Second Brain</span>
        </div>
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open menu"
        >
          <Icon name="menu" className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={closeSidebar}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 flex flex-col flex-shrink-0
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
      `}>
        {/* Logo */}
        <div className="p-6 h-20 flex items-center justify-between">
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative w-9 h-9 group cursor-pointer">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-sm opacity-70 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-slate-900 rounded-xl border border-slate-700/50 flex items-center justify-center overflow-hidden">
                <span className="text-lg">🧠</span>
              </div>
            </div>
            <span className="font-bold text-lg tracking-tight text-white font-display">Second Brain</span>
          </motion.div>
          <button
            onClick={closeSidebar}
            className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <Icon name="close" className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 mb-8">
          <form onSubmit={handleSearch} className="relative group">
            <Icon name="search" className="absolute left-3 top-2.5 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anything..."
              data-testid="global-search-input"
              className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 top-1.5 p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-slate-700 transition-colors"
              aria-label="Search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          </form>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-8">
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
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                      isActive
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30 shadow-lg shadow-indigo-500/10"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={`${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`}>
                        <Icon name={item.icon} className="w-5 h-5" />
                      </span>
                      {item.label}
                      {isActive && (
                        <motion.div
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                          layoutId="activeIndicator"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </>
                  )}
                </NavLink>
              </motion.div>
            ))}
          </nav>

          <div>
            <div className="px-4 mb-4 text-[10px] font-bold text-slate-600 uppercase tracking-[0.3em]">
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
                        `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                          isActive
                            ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30"
                            : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className={`${isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'} transition-colors`}>
                            <Icon name={item.icon} className="w-5 h-5" />
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {showBadge && (
                            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold min-w-[20px] h-[20px] flex items-center justify-center rounded-full px-1.5 shadow-lg shadow-amber-500/30">
                              {pendingClarifications}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* User Profile */}
        <motion.div
          className="p-4 border-t border-slate-800/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-700/30 rounded-2xl hover:bg-slate-800/50 hover:border-slate-600/50 transition-all cursor-pointer group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow-lg shadow-indigo-500/20">DO</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">Donal O'C.</p>
                <p className="text-[10px] text-slate-500 truncate font-medium uppercase tracking-wider">Pro Plan</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </motion.div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
