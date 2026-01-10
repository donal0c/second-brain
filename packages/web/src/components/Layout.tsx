import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/capture", label: "Capture", icon: "+" },
  { to: "/inbox", label: "Inbox", icon: "📥" },
  { to: "/today", label: "Today", icon: "📅" },
  { to: "/browse", label: "Browse", icon: "📁" },
  { to: "/clarifications", label: "Clarify", icon: "❓" },
];

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Second Brain</h1>
          <nav className="flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:bg-gray-100"
                  }`
                }
              >
                <span className="mr-1">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
