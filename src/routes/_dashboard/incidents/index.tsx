import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useIncidents } from "@/hooks/useSoc";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SeverityBadge, StatusPill } from "@/components/shared/SeverityBadge";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_dashboard/incidents/")({
  component: IncidentsPage,
});

function IncidentsPage() {
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const { data: incidents, isLoading } = useIncidents({ severity, status, search });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search by code, title, endpoint…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-64"
        />
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="CRITICAL">Critical</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="MEDIUM">Medium</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="acknowledged">Acknowledged</SelectItem>
            <SelectItem value="investigating">Investigating</SelectItem>
            <SelectItem value="contained">Contained</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : !incidents || incidents.length === 0 ? (
        <EmptyState title="No incidents match" description="Try clearing filters, or send test telemetry from the Overview page." />
      ) : (
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Incident</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Risk Score</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incidents.map((inc) => (
                <TableRow key={inc.id}>
                  <TableCell className="p-0">
                    <Link to="/incidents/$id" params={{ id: inc.id }} className="block px-4 py-3">
                      <p className="mono text-xs text-muted-foreground">{inc.incident_code}</p>
                      <p className="font-medium">{inc.title}</p>
                    </Link>
                  </TableCell>
                  <TableCell><SeverityBadge severity={inc.severity} /></TableCell>
                  <TableCell className="mono font-semibold">{inc.risk_score}</TableCell>
                  <TableCell className="text-sm">{inc.endpoints?.hostname ?? "—"}</TableCell>
                  <TableCell><StatusPill status={inc.status} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(inc.created_at).toLocaleString()}
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
