import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import type { FormEvent } from "react";

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
    "search": "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
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

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div data-design-version="v4-polish" className="flex h-screen bg-white font-sans antialiased text-gray-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-gray-50/50 border-r border-gray-100 flex flex-col flex-shrink-0">
        <div className="p-6 h-20 flex items-center justify-between">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-gray-900 text-white flex items-center justify-center text-xs font-black shadow-glow">S</div>
             <span className="font-bold text-base tracking-tight text-gray-900">Second Brain</span>
           </div>
        </div>

        <div className="px-6 mb-8">
           <form onSubmit={handleSearch} className="relative group">
              <Icon name="search" className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search anything..."
                className="w-full bg-white border border-gray-200/80 rounded-xl py-2 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/5 focus:border-gray-900 transition-all shadow-subtle"
              />
              <button
                type="submit"
                className="absolute right-2 top-1.5 p-1 rounded-lg text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
           </form>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-10">
          <div>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-white text-gray-900 shadow-premium border border-gray-100"
                        : "text-gray-400 hover:text-gray-900 hover:bg-white/50"
                    }`
                  }
                >
                  <Icon name={item.icon} className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div>
            <div className="px-4 mb-4 text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
              System
            </div>
            <nav className="space-y-1">
              {secondaryItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      isActive
                        ? "bg-white text-gray-900 shadow-premium border border-gray-100"
                        : "text-gray-400 hover:text-gray-900 hover:bg-white/50"
                    }`
                  }
                >
                  <Icon name={item.icon} className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100">
          <div className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-2xl shadow-subtle hover:shadow-premium transition-all cursor-pointer group">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gray-900 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white">DO</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate">Donal O'C.</p>
                <p className="text-[10px] text-gray-400 truncate font-medium uppercase tracking-wider">Pro Plan</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-900 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-white">
        <div className="max-w-4xl mx-auto px-12 py-16 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}