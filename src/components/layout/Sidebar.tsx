import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Monitor,
  ShieldAlert,
  Zap,
  ScrollText,
  ListChecks,
  Settings,
  ShieldCheck,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/overview", label: "SOC Overview", icon: LayoutDashboard },
  { to: "/endpoints", label: "Endpoints", icon: Monitor },
  { to: "/incidents", label: "Alerts / Incidents", icon: ShieldAlert },
  { to: "/response-center", label: "Response Center", icon: Zap },
  { to: "/audit-logs", label: "Audit Logs", icon: ScrollText },
  { to: "/detection-rules", label: "Detection Rules", icon: ListChecks },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar({
  userEmail,
  onSignOut,
}: {
  userEmail?: string | null;
  onSignOut: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-64",
      )}
    >
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <ShieldCheck className="size-6 shrink-0 text-primary" />
        {!collapsed && <span className="mono text-sm font-semibold tracking-wide">AegisX</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="mb-1 flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent/60"
        >
          {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          {!collapsed && "Collapse"}
        </button>
        <div className="flex items-center gap-2 rounded-md px-3 py-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-semibold text-primary">
            {(userEmail ?? "A").slice(0, 1).toUpperCase()}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{userEmail ?? "Analyst"}</p>
              <button onClick={onSignOut} className="text-[11px] text-muted-foreground hover:text-foreground">
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
