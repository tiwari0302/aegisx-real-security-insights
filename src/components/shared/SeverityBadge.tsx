import { cn } from "@/lib/utils";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

const styles: Record<Severity, string> = {
  CRITICAL: "bg-critical/15 text-critical border-critical/40",
  HIGH: "bg-high/15 text-high border-high/40",
  MEDIUM: "bg-medium/15 text-medium border-medium/40",
  LOW: "bg-low/15 text-low border-low/40",
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity | string;
  className?: string;
}) {
  const key = (severity as Severity) in styles ? (severity as Severity) : "LOW";
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wider uppercase",
        styles[key],
        className,
      )}
    >
      {key}
    </span>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    open: "bg-critical/15 text-critical border-critical/40",
    acknowledged: "bg-high/15 text-high border-high/40",
    investigating: "bg-medium/15 text-medium border-medium/40",
    contained: "bg-online/15 text-online border-online/40",
    closed: "bg-muted text-muted-foreground border-border",
    completed: "bg-online/15 text-online border-online/40",
    pending_agent: "bg-medium/15 text-medium border-medium/40",
    failed: "bg-critical/15 text-critical border-critical/40",
  };
  return (
    <span
      className={cn(
        "mono inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] tracking-wide uppercase",
        map[status] ?? "bg-muted text-muted-foreground border-border",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
