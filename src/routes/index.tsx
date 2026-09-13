import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ArrowRight, GitBranch, Sparkles, ScrollText, Zap } from "lucide-react";
import { useAuthSession } from "@/hooks/useAuthSession";
import { SeverityBadge } from "@/components/shared/SeverityBadge";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const { session } = useAuthSession();
  const dashboardTarget = session ? "/overview" : "/login";

  return (
    <div className="grid-bg min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-primary" />
          <span className="mono text-sm font-semibold tracking-wide">AegisX</span>
        </div>
        <Link
          to={dashboardTarget}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {session ? "Go to dashboard" : "Sign in"}
        </Link>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div>
          <h1 className="text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            See the process chain before it becomes a breach.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
            AegisX watches what actually runs on your endpoints, scores the behavior that matters,
            and hands your analysts a finished case — not a wall of raw logs.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to={dashboardTarget}
              className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {session ? "Go to dashboard" : "Get started"}
              <ArrowRight className="size-4" />
            </Link>
            <Link
              to="/login"
              className="rounded-md px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Try the demo analyst account
            </Link>
          </div>
        </div>

        {/* Live-looking incident mockup — the product's actual unit of value, not stock art */}
        <div className="panel p-5">
          <div className="flex items-center justify-between">
            <p className="mono text-xs text-muted-foreground">AX-000241</p>
            <SeverityBadge severity="CRITICAL" />
          </div>
          <p className="mt-2 text-sm font-medium">Encoded PowerShell launched from Word attachment</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {["WINWORD.EXE", "POWERSHELL.EXE", "203.0.113.44:443"].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <span className="mono rounded border border-border bg-surface-2 px-2 py-1 text-[11px]">{step}</span>
                {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Office spawned a script host</span>
              <span className="font-semibold text-high">+30</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Base64-encoded command line</span>
              <span className="font-semibold text-high">+25</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Outbound connection, unrecognized host</span>
              <span className="font-semibold text-high">+20</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="mono text-xs text-muted-foreground">T1059.001 · PowerShell</span>
            <span className="mono text-lg font-bold">75<span className="text-xs text-muted-foreground">/100</span></span>
          </div>
        </div>
      </section>

      {/* Quiet stats strip */}
      <section className="border-y border-border bg-surface/40">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6 px-6 py-6 text-sm text-muted-foreground">
          <p>Rule engine scores every process chain, not just single events</p>
          <p>Every finding maps to MITRE ATT&CK</p>
          <p>Every action is written to an audit trail</p>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <Feature
            icon={GitBranch}
            title="Correlated, not scattered"
            description="Related events on the same endpoint are grouped into one incident with a full process chain, so your team investigates a story instead of a pile of alerts."
          />
          <Feature
            icon={Sparkles}
            title="A summary an analyst can act on"
            description="Each incident gets a plain-language write-up of what happened, why it's suspicious, and what to do next — generated from the actual evidence, not a template."
          />
          <Feature
            icon={Zap}
            title="Response without leaving the case"
            description="Acknowledge, assign, isolate, or terminate directly from the incident. Every action is agent-verified against the real PID before anything runs."
          />
          <Feature
            icon={ScrollText}
            title="Nothing happens off the record"
            description="Detections, response actions, and rule changes all land in an audit log you can hand to a client or an auditor as-is."
          />
        </div>
      </section>

      {/* How it works — genuinely a sequence, so numbering earns its place */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
          <Step n={1} title="The agent watches" description="A lightweight agent on each endpoint reports real process, command-line, and network activity as it happens." />
          <Step n={2} title="The engine scores it" description="Rules and correlation turn raw activity into a weighted risk score and a MITRE technique, in real time." />
          <Step n={3} title="Your analyst decides" description="Every incident lands with evidence attached — acknowledge it, escalate it, or shut it down on the spot." />
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">Ready to see what's actually running on your endpoints?</p>
          <Link
            to={dashboardTarget}
            className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            {session ? "Go to dashboard" : "Get started"}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof GitBranch;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4">
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function Step({ n, title, description }: { n: number; title: string; description: string }) {
  return (
    <div className="panel p-5">
      <span className="mono text-xs text-muted-foreground">{String(n).padStart(2, "0")}</span>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
