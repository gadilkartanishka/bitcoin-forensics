import { useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Bell,
  Search,
  Waypoints,
} from "lucide-react";

const navItems = [
  { id: "overview", icon: LayoutDashboard, label: "Overview" },
  { id: "alerts", icon: Bell, label: "Alerts" },
  { id: "investigate", icon: Search, label: "Investigate" },
  { id: "graph", icon: Waypoints, label: "Graph" },
];

export function Sidebar({ active = "overview" }) {
  const [hovered, setHovered] = useState(null);

  return (
    <aside className="fixed top-0 left-0 h-screen w-16 flex flex-col items-center bg-shell py-5 z-50">
      {/* app icon */}
      <div className="mb-8 text-text-muted">
        <ShieldCheck size={24} />
      </div>

      {/* nav icons */}
      <nav className="flex flex-col items-center gap-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.id === active;

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => {}}
                onMouseEnter={() => setHovered(item.id)}
                onMouseLeave={() => setHovered(null)}
                className={`flex items-center justify-center w-10 h-10 rounded-lg cursor-pointer ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-text-faint hover:text-text-muted hover:bg-surface-hover"
                }`}
              >
                <Icon size={20} />
              </button>

              {/* tooltip */}
              {hovered === item.id && (
                <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-text-primary bg-surface border border-border rounded whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
