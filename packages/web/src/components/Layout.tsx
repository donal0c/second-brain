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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Second Brain</h1>
            <form onSubmit={handleSearch} className="flex-1 max-w-md mx-6">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks, projects, ideas..."
                  className="w-full px-4 py-2.5 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-150 text-sm placeholder:text-slate-400"
                />
                <span className="absolute left-3 top-2.5 text-slate-400 text-lg">🔍</span>
              </div>
            </form>
          </div>
          <nav className="flex gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`
                }
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
