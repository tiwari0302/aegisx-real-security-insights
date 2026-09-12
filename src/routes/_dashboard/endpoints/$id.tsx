import { createFileRoute, Link } from "@tanstack/react-router";
import { useEndpoint } from "@/hooks/useSoc";
import { SeverityBadge, StatusPill } from "@/components/shared/SeverityBadge";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_dashboard/endpoints/$id")({
  component: EndpointDetailsPage,
});

function EndpointDetailsPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useEndpoint(id);

  if (isLoading) return <LoadingSkeleton rows={4} />;
  if (!data?.endpoint) return <EmptyState title="Endpoint not found" description="It may have been removed." />;

  const { endpoint, events, incidents } = data;

  return (
    <div className="space-y-6">
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mono text-lg font-semibold">{endpoint.hostname}</h2>
            <p className="text-sm text-muted-foreground">{endpoint.os}</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={endpoint.status} />
            <SeverityBadge severity={endpoint.risk_level} />
            {endpoint.isolated && <SeverityBadge severity="CRITICAL" className="ml-1" />}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Agent Version</p>
            <p className="mono">{endpoint.agent_version}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Last Heartbeat</p>
            <p>{endpoint.last_heartbeat ? new Date(endpoint.last_heartbeat).toLocaleString() : "never"}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Enrolled</p>
            <p>{new Date(endpoint.created_at).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase text-muted-foreground">Isolated</p>
            <p>{endpoint.isolated ? "Yes" : "No"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="panel">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Recent Events (real telemetry)</h3>
          </div>
          {events.length === 0 ? (
            <EmptyState title="No events yet" description="Nothing has been ingested from this endpoint." />
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {events.map((e) => (
                <li key={e.id} className="px-4 py-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="mono font-medium">{e.event_type}</span>
                    <span className="text-muted-foreground">{new Date(e.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="mt-0.5 truncate text-muted-foreground">
                    {JSON.stringify(e.payload).slice(0, 120)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Related Incidents</h3>
          </div>
          {incidents.length === 0 ? (
            <EmptyState title="No incidents" description="This endpoint has no associated incidents." />
          ) : (
            <ul className="divide-y divide-border">
              {incidents.map((inc) => (
                <li key={inc.id}>
                  <Link
                    to="/incidents/$id"
                    params={{ id: inc.id }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-accent/40"
                  >
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={inc.severity} />
                      <span className="truncate">{inc.title}</span>
                    </div>
                    <span className="mono text-[11px] text-muted-foreground">{inc.incident_code}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
