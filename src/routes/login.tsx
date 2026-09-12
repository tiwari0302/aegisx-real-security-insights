import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { continueAsDemoAnalyst, signInWithPassword, signUpWithPassword } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState<"idle" | "form" | "demo">("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/overview" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("form");
    try {
      if (mode === "signin") {
        await signInWithPassword(email, password);
      } else {
        await signUpWithPassword(email, password, fullName);
      }
      navigate({ to: "/overview" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading("idle");
    }
  }

  async function handleDemo() {
    setError(null);
    setLoading("demo");
    try {
      await continueAsDemoAnalyst();
      navigate({ to: "/overview" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start demo session");
    } finally {
      setLoading("idle");
    }
  }

  return (
    <div className="grid-bg flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-2 text-center">
          <div className="rounded-full border border-border bg-surface p-3 shadow-glow">
            <ShieldCheck className="size-7 text-primary" />
          </div>
          <h1 className="mono text-lg font-semibold tracking-wide">AegisX</h1>
          <p className="text-xs text-muted-foreground">See. Understand. Respond.</p>
        </div>

        <div className="panel p-6">
          <div className="mb-5 flex rounded-md border border-border bg-surface-2 p-1 text-xs">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors ${mode === "signin" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded px-2 py-1.5 font-medium transition-colors ${mode === "signup" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="analyst@yourcompany.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-xs text-critical">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading !== "idle"}>
              {loading === "form" && <Loader2 className="size-4 animate-spin" />}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="my-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="secondary" className="w-full" onClick={handleDemo} disabled={loading !== "idle"}>
            {loading === "demo" && <Loader2 className="size-4 animate-spin" />}
            Continue as Demo Analyst
          </Button>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Real Supabase account, seeded with an empty demo organization — nothing here is faked.
          </p>
        </div>
      </div>
    </div>
  );
}
