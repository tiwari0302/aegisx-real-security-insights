import { Bell, Search, Sun, Moon, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

export function Topbar({
  title,
  openCriticalCount = 0,
  lastRealtimeEvent,
}: {
  title: string;
  openCriticalCount?: number;
  lastRealtimeEvent?: string | null;
}) {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setLight(isLight);
  }, []);

  function toggleTheme() {
    document.documentElement.classList.toggle("light");
    setLight((l) => !l);
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border bg-background/80 px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold tracking-tight">{title}</h1>
        {lastRealtimeEvent && (
          <span className="mono flex items-center gap-1 text-[11px] text-online">
            <Radio className="size-3 animate-pulse" /> live
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search incidents, endpoints…" className="h-8 w-64 pl-8 text-xs" />
        </div>
        <button className="relative rounded-md p-2 hover:bg-accent" aria-label="Notifications">
          <Bell className="size-4" />
          {openCriticalCount > 0 && (
            <span className="mono absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-critical text-[9px] font-bold text-critical-foreground">
              {openCriticalCount > 9 ? "9+" : openCriticalCount}
            </span>
          )}
        </button>
        <button onClick={toggleTheme} className="rounded-md p-2 hover:bg-accent" aria-label="Toggle theme">
          {light ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </div>
    </header>
  );
}
