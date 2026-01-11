import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { to: "/capture", label: "Capture", icon: "+" },
  { to: "/inbox", label: "Inbox", icon: "📥" },
  { to: "/today", label: "Today", icon: "📅" },
  { to: "/digest/dashboard", label: "Digest", icon: "📊" },
  { to: "/digest/weekly", label: "Weekly", icon: "📅" },
  { to: "/browse", label: "Browse", icon: "📁" },
  { to: "/clarifications", label: "Clarify", icon: "❓" },
  { to: "/receipts", label: "Receipts", icon: "🧾" },
];

export function Layout() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-subtle selection:bg-primary-subtle selection:text-primary-active">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/60 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16 gap-4">
            <h1 className="text-lg font-semibold text-gray-900 tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary-hover"></span>
              Second Brain
            </h1>
            
            <form onSubmit={handleSearch} className="flex-1 max-w-sm">
              <div className="relative group">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-4 py-1.5 pl-9 bg-gray-100/50 border border-transparent rounded-md 
                           text-sm text-gray-900 placeholder:text-gray-500
                           transition-all duration-200
                           group-hover:bg-gray-100 group-hover:border-gray-200
                           focus:bg-white focus:border-primary-hover/50 focus:ring-4 focus:ring-primary-subtle/30 focus:outline-none"
                />
                <span className="absolute left-2.5 top-1.5 text-gray-400 group-hover:text-gray-500 transition-colors text-sm">
                  🔍
                </span>
              </div>
            </form>
          </div>
          
          <nav className="flex gap-1 overflow-x-auto pb-0 -mb-px scrollbar-hide">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-2.5 text-sm font-medium border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                    isActive
                      ? "border-primary-hover text-primary-active"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300"
                  }`
                }
              >
                <span className="opacity-70 text-xs">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        <div className="max-w-5xl mx-auto animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}