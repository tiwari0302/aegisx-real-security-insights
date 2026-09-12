import { Outlet, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useProfile, useOverviewStats, useRealtimeSoc } from "@/hooks/useSoc";
import { signOut } from "@/lib/auth";
import { LoadingSkeleton } from "@/components/shared/EmptyState";

/** Titles keyed by the first path segment, used for the Topbar heading. */
const TITLES: Record<string, string> = {
  overview: "SOC Overview",
  endpoints: "Endpoints",
  incidents: "Alerts / Incidents",
  "response-center": "Response Center",
  "audit-logs": "Audit Logs",
  "detection-rules": "Detection Rules",
  settings: "Settings",
};

export function DashboardLayout({ pathSegment, title }: { pathSegment?: string | undefined; title?: string | undefined }) {
  const navigate = useNavigate();
  const { data: profile, isLoading, isError } = useProfile();
  const { data: overview } = useOverviewStats();
  const lastRealtimeEvent = useRealtimeSoc();

  useEffect(() => {
    if (!isLoading && (isError || profile === null)) {
      navigate({ to: "/login" });
    }
  }, [isLoading, isError, profile, navigate]);

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingSkeleton rows={1} />
      </div>
    );
  }

  return (
    <div className="grid-bg flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar userEmail={profile.email} onSignOut={() => signOut().then(() => navigate({ to: "/login" }))} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title ?? (pathSegment ? (TITLES[pathSegment] ?? "AegisX") : "AegisX")}
          openCriticalCount={overview?.counts.CRITICAL ?? 0}
          lastRealtimeEvent={lastRealtimeEvent}
        />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function useOrgEnrollKey() {
  const { data: profile } = useProfile();
  return profile?.organizations?.enroll_key as string | undefined;
}

export type { ReactNode };
