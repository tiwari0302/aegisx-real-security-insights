import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  UserPlus,
  Search,
  Lock,
  Skull,
} from "lucide-react";
import { useIncident, usePerformResponseAction } from "@/hooks/useSoc";
import { SeverityBadge, StatusPill } from "@/components/shared/SeverityBadge";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/incidents/$id")({
  component: IncidentPage,
});

type MatchedRule = { rule: string; weight: number; description: string; evidence: string };

const ACTIONS = [
  { type: "acknowledge", label: "Acknowledge", icon: CheckCircle2, variant: "secondary" as const },
  { type: "assign", label: "Assign to me", icon: UserPlus, variant: "secondary" as const },
  { type: "mark_investigating", label: "Investigate", icon: Search, variant: "default" as const },
  { type: "simulate_isolate", label: "Isolate (simulate)", icon: Lock, variant: "destructive" as const },
  { type: "terminate_process", label: "Terminate test process", icon: Skull, variant: "destructive" as const },
];

function IncidentPage() {
  const { id } = Route.useParams();
  const { data, isLoading } = useIncident(id);
  const performAction = usePerformResponseAction();
  const [confirming, setConfirming] = useState<string | null>(null);

  if (isLoading) return <LoadingSkeleton rows={6} />;
  if (!data?.incident) return <EmptyState title="Incident not found" description="It may have been removed or you lack access." />;

  const { incident, detections, mitre, actions, audit, events } = data;
  const latestReasons = (detections[0]?.reasons as MatchedRule[] | undefined) ?? [];
  const processChain = events
    .filter((e) => e.event_type === "process_create")
    .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp));

  async function handleConfirm(actionType: string) {
    setConfirming(null);
    try {
      await performAction.mutateAsync({ incidentId: id, actionType });
      toast.success("Response action recorded and audited");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mono text-xs text-muted-foreground">{incident.incident_code}</p>
            <h2 className="mt-1 text-xl font-semibold">{incident.title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <SeverityBadge severity={incident.severity} />
              <StatusPill status={incident.status} />
              {incident.endpoints?.hostname && (
                <Link
                  to="/endpoints/$id"
                  params={{ id: incident.endpoint_id as string }}
                  className="mono text-xs text-primary hover:underline"
                >
                  {incident.endpoints.hostname}
                </Link>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(incident.created_at).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="mono text-3xl font-bold">{incident.risk_score}<span className="text-sm text-muted-foreground">/100</span></p>
            <div className="mt-1 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-critical"
                style={{ width: `${Math.min(incident.risk_score, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Process chain */}
          <div className="panel p-5">
            <h3 className="mb-4 text-sm font-semibold">Process Chain</h3>
            {processChain.length === 0 ? (
              <p className="text-sm text-muted-foreground">No process_create events correlated with this incident.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {processChain.map((e, i) => {
                  const payload = e.payload as Record<string, unknown>;
                  const name = String(payload["process_name"] ?? "UNKNOWN.EXE");
                  return (
                    <div key={e.id} className="flex items-center gap-2">
                      <div className="panel border-border px-3 py-2">
                        <p className="mono text-sm font-semibold">{name}</p>
                        <p className="mono text-[10px] text-muted-foreground">pid {String(payload["pid"] ?? "?")}</p>
                      </div>
                      {i < processChain.length - 1 && <ArrowRight className="size-4 text-muted-foreground" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Evidence + detection reasons */}
          <div className="panel p-5">
            <h3 className="mb-3 text-sm font-semibold">Evidence & Why the Score Increased</h3>
            {latestReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground">No detection reasons recorded.</p>
            ) : (
              <ul className="space-y-2">
                {latestReasons.map((r, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{r.description}</p>
                      <p className="mono mt-0.5 text-xs text-muted-foreground">{r.evidence}</p>
                    </div>
                    <span className="mono shrink-0 text-xs font-semibold text-high">+{r.weight}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* MITRE */}
          <div className="panel p-5">
            <h3 className="mb-3 text-sm font-semibold">MITRE ATT&CK Mapping</h3>
            {mitre.length === 0 ? (
              <p className="text-sm text-muted-foreground">No technique mapped with sufficient confidence.</p>
            ) : (
              <ul className="space-y-2">
                {mitre.map((m) => (
                  <li key={m.id} className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm">
                    <p className="mono font-semibold text-primary">{m.technique_id} — {m.technique_name}</p>
                    {m.evidence && <p className="mt-0.5 text-xs text-muted-foreground">{m.evidence}</p>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* AI summary */}
          <div className="panel border-primary/30 bg-primary/5 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">AI Summary</h3>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90">
              {incident.summary ?? "AI summary not yet generated for this incident (LLM key may not be configured server-side)."}
            </p>
          </div>

          {/* Timeline */}
          <div className="panel p-5">
            <h3 className="mb-3 text-sm font-semibold">Timeline</h3>
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground">No correlated events.</p>
            ) : (
              <ul className="space-y-3 border-l border-border pl-4">
                {events
                  .slice()
                  .sort((a, b) => +new Date(a.timestamp) - +new Date(b.timestamp))
                  .map((e) => (
                    <li key={e.id} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1 size-2 rounded-full bg-primary" />
                      <p className="mono text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</p>
                      <p className="font-medium">{e.event_type}</p>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right column: response + audit */}
        <div className="space-y-6">
          <div className="panel p-5">
            <div className="mb-3 flex items-center gap-2">
              <ShieldAlert className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Response Actions</h3>
            </div>
            <div className="space-y-2">
              {ACTIONS.map((a) => (
                <Button
                  key={a.type}
                  variant={a.variant}
                  size="sm"
                  className="w-full justify-start"
                  disabled={performAction.isPending}
                  onClick={() => setConfirming(a.type)}
                >
                  {performAction.isPending && confirming === a.type ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <a.icon className="size-4" />
                  )}
                  {a.label}
                </Button>
              ))}
            </div>

            {actions.length > 0 && (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">History</p>
                <ul className="space-y-1.5">
                  {actions.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-xs">
                      <span className="capitalize">{a.action_type.replace(/_/g, " ")}</span>
                      <StatusPill status={a.status} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="mb-3 text-sm font-semibold">Audit Log</h3>
            {audit.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit entries yet.</p>
            ) : (
              <ul className="space-y-2 text-xs">
                {audit.map((a) => (
                  <li key={a.id} className="border-b border-border pb-2 last:border-0">
                    <p><span className="font-medium">{a.actor}</span> — {a.action.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!confirming} onOpenChange={(open) => !open && setConfirming(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm response action</AlertDialogTitle>
            <AlertDialogDescription>
              This writes a real, audited entry to response_actions and audit_logs for {incident.incident_code}.
              {confirming === "terminate_process" &&
                " The agent will only terminate a process if the target PID and process name match exactly — nothing arbitrary."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirming && handleConfirm(confirming)}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
