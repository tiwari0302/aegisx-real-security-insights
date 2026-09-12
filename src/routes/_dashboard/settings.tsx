import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useProfile } from "@/hooks/useSoc";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSkeleton } from "@/components/shared/EmptyState";
import { toast } from "sonner";

export const Route = createFileRoute("/_dashboard/settings")({
  component: SettingsPage,
});

function useUpdateFullName() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fullName: string) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile"] }),
  });
}

function SettingsPage() {
  const { data: profile, isLoading } = useProfile();
  const updateName = useUpdateFullName();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [copied, setCopied] = useState(false);

  if (isLoading || !profile) return <LoadingSkeleton rows={3} />;

  const enrollKey = profile.organizations?.enroll_key as string | undefined;
  const orgName = profile.organizations?.name as string | undefined;

  function copyKey() {
    if (!enrollKey) return;
    navigator.clipboard.writeText(enrollKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSaveName() {
    try {
      await updateName.mutateAsync(fullName || profile!.full_name || "");
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile");
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="panel p-5">
        <h3 className="mb-4 text-sm font-semibold">Profile</h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <div className="flex gap-2">
              <Input
                value={fullName || profile.full_name || ""}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
              <Button onClick={handleSaveName} disabled={updateName.isPending}>
                {updateName.isPending && <Loader2 className="size-4 animate-spin" />}
                Save
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value={profile.role} disabled />
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h3 className="mb-1 text-sm font-semibold">Organization</h3>
        <p className="mb-4 text-sm text-muted-foreground">{orgName}</p>

        <Label>Agent enrollment key</Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Paste this into the Windows Agent's <code className="mono">config.json</code> so it can call{" "}
          <code className="mono">agent-enroll</code> and start reporting real telemetry.
        </p>
        <div className="flex gap-2">
          <Input value={enrollKey ?? ""} readOnly className="mono" />
          <Button variant="secondary" onClick={copyKey}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
