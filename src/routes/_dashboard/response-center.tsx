import { createFileRoute, Link } from "@tanstack/react-router";
import { useResponseActions } from "@/hooks/useSoc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/shared/SeverityBadge";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_dashboard/response-center")({
  component: ResponseCenterPage,
});

function ResponseCenterPage() {
  const { data: actions, isLoading } = useResponseActions();

  if (isLoading) return <LoadingSkeleton rows={5} />;

  if (!actions || actions.length === 0) {
    return (
      <EmptyState
        title="No response actions yet"
        description="Actions taken from an Incident Investigation page (acknowledge, isolate, terminate, etc.) will show up here in real time, each with a persisted audit entry."
      />
    );
  }

  return (
    <div className="panel overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Incident</TableHead>
            <TableHead>Endpoint</TableHead>
            <TableHead>Requested By</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>When</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {actions.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium capitalize">{a.action_type.replace(/_/g, " ")}</TableCell>
              <TableCell>
                {a.incident_id ? (
                  <Link to="/incidents/$id" params={{ id: a.incident_id }} className="mono text-xs text-primary hover:underline">
                    {a.incidents?.incident_code ?? a.incident_id.slice(0, 8)}
                  </Link>
                ) : (
                  "—"
                )}
              </TableCell>
              <TableCell className="text-sm">{a.endpoints?.hostname ?? "—"}</TableCell>
              <TableCell className="text-sm">{a.requested_by}</TableCell>
              <TableCell><StatusPill status={a.status} /></TableCell>
              <TableCell className="max-w-xs truncate text-xs text-muted-foreground">{a.result ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
