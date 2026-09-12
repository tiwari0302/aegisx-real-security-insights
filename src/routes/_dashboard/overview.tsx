import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Zap, Loader2 } from "lucide-react";
import { useOverviewStats, useEndpoints } from "@/hooks/useSoc";
import { useSendTestTelemetry } from "@/hooks/useSoc";
import { Button } from "@/components/ui/button";
import { SeverityBadge, StatusPill } from "@/components/shared/SeverityBadge";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/overview")({
  component: OverviewPage,
});

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const KPI_DEFS = [
  { key: "CRITICAL", label: "Critical", className: "text-critical" },
  { key: "HIGH", label: "High", className: "text-high" },
  { key: "MEDIUM", label: "Medium", className: "text-medium" },
  { key: "LOW", label: "Low", className: "text-low" },
] as const;

function OverviewPage() {
  const { data: stats, isLoading } = useOverviewStats();
  const { data: endpoints } = useEndpoints();
  const testTelemetry = useSendTestTelemetry();

  async function handleSendTelemetry() {
    try {
      const result = await testTelemetry.mutateAsync();
      if (result.incidents_created.length > 0) {
        toast.success(`New incident created from real pipeline (${result.incidents_created.length})`);
      } else {
        toast.info(`Telemetry ingested (${result.inserted} events) — no new incident this time`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send test telemetry");
    }
  }

  if (isLoading || !stats) return <LoadingSkeleton rows={5} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Live counts computed from your organization's real incidents and endpoints.
        </p>
        <Button onClick={handleSendTelemetry} disabled={testTelemetry.isPending}>
          {testTelemetry.isPending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          Send Test Telemetry
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {KPI_DEFS.map(({ key, label, className }) => (
          <div key={key} className="panel p-4">
            <p className="mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${className}`}>{stats.counts[key]}</p>
          </div>
        ))}
        <div className="panel p-4">
          <p className="mono text-[11px] uppercase tracking-wider text-muted-foreground">Online</p>
          <p className="mt-1 text-2xl font-bold text-online">{stats.online}</p>
        </div>
        <div className="panel p-4">
          <p className="mono text-[11px] uppercase tracking-wider text-muted-foreground">Offline</p>
          <p className="mt-1 text-2xl font-bold text-muted-foreground">{stats.offline}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent incidents feed */}
        <div className="panel lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Recent Incidents</h2>
            <Link to="/incidents" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          {stats.recent.length === 0 ? (
            <EmptyState
              title="No incidents yet"
              description="Send test telemetry above, or wait for your Windows agent to report real activity."
            />
          ) : (
            <ul className="divide-y divide-border">
              {stats.recent.map((incident) => (
                <li key={incident.id}>
                  <Link
                    to="/incidents/$id"
                    params={{ id: incident.id }}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-accent/40"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <SeverityBadge severity={incident.severity} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{incident.title}</p>
                        <p className="mono text-[11px] text-muted-foreground">
                          {incident.incident_code} · {incident.endpoints?.hostname ?? "unknown host"}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(incident.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Endpoint health summary */}
        <div className="panel">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Endpoint Health</h2>
          </div>
          {!endpoints || endpoints.length === 0 ? (
            <EmptyState
              title="No endpoints enrolled"
              description="Install the AegisX Agent and enroll it with your organization's key from Settings."
            />
          ) : (
            <ul className="divide-y divide-border">
              {endpoints.slice(0, 6).map((ep) => (
                <li key={ep.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="truncate">{ep.hostname}</span>
                  <StatusPill status={ep.status} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Severity trend */}
      <div className="panel p-4">
        <h2 className="mb-3 text-sm font-semibold">Incidents by Severity — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.trend}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} stroke="var(--color-muted-foreground)" />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} stroke="var(--color-muted-foreground)" />
            <Tooltip
              contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", fontSize: 12 }}
            />
            <Bar dataKey="CRITICAL" stackId="sev" fill="var(--color-critical)" />
            <Bar dataKey="HIGH" stackId="sev" fill="var(--color-high)" />
            <Bar dataKey="MEDIUM" stackId="sev" fill="var(--color-medium)" />
            <Bar dataKey="LOW" stackId="sev" fill="var(--color-low)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
