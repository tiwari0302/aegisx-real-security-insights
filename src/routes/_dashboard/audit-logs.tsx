import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuditLogs } from "@/hooks/useSoc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_dashboard/audit-logs")({
  component: AuditLogsPage,
});

function AuditLogsPage() {
  const [search, setSearch] = useState("");
  const { data: logs, isLoading } = useAuditLogs(search);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search by actor, action, target…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 w-72"
      />

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : !logs || logs.length === 0 ? (
        <EmptyState title="No audit entries" description="Every response action and incident event writes a real row here — nothing is pruned or faked." />
      ) : (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Incident</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{log.actor}</TableCell>
                  <TableCell className="font-medium capitalize">{log.action.replace(/_/g, " ")}</TableCell>
                  <TableCell className="mono text-xs">{log.target ?? "—"}</TableCell>
                  <TableCell className="mono text-xs text-muted-foreground">
                    {log.incidents?.incident_code ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-xs text-muted-foreground">
                    {JSON.stringify(log.details)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
