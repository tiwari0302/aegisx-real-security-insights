import { createFileRoute, Link } from "@tanstack/react-router";
import { useEndpoints } from "@/hooks/useSoc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge, StatusPill } from "@/components/shared/SeverityBadge";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";

export const Route = createFileRoute("/_dashboard/endpoints/")({
  component: EndpointsPage,
});

function EndpointsPage() {
  const { data: endpoints, isLoading } = useEndpoints();

  if (isLoading) return <LoadingSkeleton rows={5} />;

  if (!endpoints || endpoints.length === 0) {
    return (
      <EmptyState
        title="No endpoints enrolled yet"
        description="Install the AegisX Agent on an authorized Windows machine and enroll it using the organization key from Settings. It will appear here the moment it sends its first heartbeat."
      />
    );
  }

  return (
    <div className="panel overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Hostname</TableHead>
            <TableHead>OS</TableHead>
            <TableHead>Agent Version</TableHead>
            <TableHead>Last Heartbeat</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Risk Level</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {endpoints.map((ep) => (
            <TableRow key={ep.id} className="cursor-pointer">
              <TableCell className="p-0">
                <Link to="/endpoints/$id" params={{ id: ep.id }} className="block px-4 py-3 font-medium">
                  {ep.hostname}
                </Link>
              </TableCell>
              <TableCell>{ep.os}</TableCell>
              <TableCell className="mono text-xs">{ep.agent_version}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {ep.last_heartbeat ? new Date(ep.last_heartbeat).toLocaleString() : "never"}
              </TableCell>
              <TableCell>
                <StatusPill status={ep.status} />
              </TableCell>
              <TableCell>
                <SeverityBadge severity={ep.risk_level} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
