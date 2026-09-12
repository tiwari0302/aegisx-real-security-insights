import { createFileRoute } from "@tanstack/react-router";
import { useDetectionRules, useToggleDetectionRule } from "@/hooks/useSoc";
import { SeverityBadge } from "@/components/shared/SeverityBadge";
import { EmptyState, LoadingSkeleton } from "@/components/shared/EmptyState";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/detection-rules")({
  component: DetectionRulesPage,
});

function DetectionRulesPage() {
  const { data: rules, isLoading } = useDetectionRules();
  const toggle = useToggleDetectionRule();

  if (isLoading) return <LoadingSkeleton rows={5} />;
  if (!rules || rules.length === 0) {
    return <EmptyState title="No detection rules" description="Rules are seeded automatically when your organization is created." />;
  }

  async function handleToggle(id: string, enabled: boolean) {
    try {
      await toggle.mutateAsync({ id, enabled });
      toast.success(enabled ? "Rule enabled" : "Rule disabled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update rule");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Toggling a rule off here really disables it in the live detection pipeline — the next batch of events
        won't be checked against it.
      </p>
      {rules.map((rule) => (
        <div key={rule.id} className="panel flex items-center justify-between gap-4 p-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium">{rule.name}</p>
              <SeverityBadge severity={rule.severity} />
              <span className="mono text-xs text-muted-foreground">weight {rule.weight}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
            <p className="mono mt-1 text-[11px] text-muted-foreground">
              {rule.rule_key} · logic v{rule.logic_version}
            </p>
          </div>
          <Switch checked={rule.enabled} onCheckedChange={(v) => handleToggle(rule.id, v)} />
        </div>
      ))}
    </div>
  );
}
