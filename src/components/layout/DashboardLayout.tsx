import { Outlet, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useProfile, useOverviewStats, useRealtimeSoc } from "@/hooks/useSoc";
import { useAuthSession } from "@/hooks/useAuthSession";
import { signOut } from "@/lib/auth";

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
  const { session, isLoading: sessionLoading } = useAuthSession();
  const { data: profile, isLoading: profileLoading, isError, refetch } = useProfile();
  const { data: overview } = useOverviewStats();
  const lastRealtimeEvent = useRealtimeSoc();

  // Only ever redirect to /login when we're SURE there's no session. Never
  // redirect just because the profile row hasn't loaded yet — that's what
  // caused the /login <-> /overview ping-pong (login redirects away whenever
  // a session exists, so bouncing here on a merely-missing profile fights it).
  useEffect(() => {
    if (!sessionLoading && !session) {
      navigate({ to: "/login", replace: true });
    }
  }, [sessionLoading, session, navigate]);

  if (sessionLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Session is real, but the profile row (created by a DB trigger on signup)
  // hasn't shown up yet, or failed to load. Wait/offer retry — don't bounce.
  if (profileLoading || !profile) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin text-primary" />
        <p>{isError ? "Couldn't load your profile." : "Setting up your account…"}</p>
        {isError && (
          <button onClick={() => refetch()} className="text-primary underline">
            Try again
          </button>
        )}
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
