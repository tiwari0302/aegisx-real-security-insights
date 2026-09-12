import { createFileRoute } from "@tanstack/react-router";
import {
  generateDeviceToken,
  json,
  rateLimit,
  sha256Hex,
} from "@/lib/agent-auth.server";

export const Route = createFileRoute("/api/public/agent-enroll")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!rateLimit("enroll", 30)) return json({ error: "rate_limited" }, 429);

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const hostname = String(body["hostname"] ?? "").trim().slice(0, 128);
        const os = String(body["os"] ?? "").trim().slice(0, 128);
        const agentVersion = String(body["agent_version"] ?? "").trim().slice(0, 32);
        const enrollKey = String(body["enroll_key"] ?? "").trim();

        if (!hostname || !os || !agentVersion || !enrollKey) {
          return json({ error: "hostname, os, agent_version and enroll_key are required" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("id")
          .eq("enroll_key", enrollKey)
          .maybeSingle();
        if (!org) return json({ error: "invalid_enroll_key" }, 401);

        const { data: existing } = await supabaseAdmin
          .from("endpoints")
          .select("id")
          .eq("organization_id", org.id)
          .eq("hostname", hostname)
          .maybeSingle();

        let endpointId: string;
        if (existing?.id) {
          endpointId = existing.id as string;
          await supabaseAdmin
            .from("endpoints")
            .update({
              os,
              agent_version: agentVersion,
              status: "online",
              last_heartbeat: new Date().toISOString(),
            })
            .eq("id", endpointId);
        } else {
          const { data: created, error } = await supabaseAdmin
            .from("endpoints")
            .insert({
              organization_id: org.id,
              hostname,
              os,
              agent_version: agentVersion,
              status: "online",
              last_heartbeat: new Date().toISOString(),
            })
            .select("id")
            .single();
          if (error) return json({ error: error.message }, 500);
          endpointId = created.id as string;
        }

        const token = generateDeviceToken();
        await supabaseAdmin.from("device_tokens").insert({
          endpoint_id: endpointId,
          organization_id: org.id,
          token_hash: await sha256Hex(token),
        });

        await supabaseAdmin.from("audit_logs").insert({
          organization_id: org.id,
          actor: `agent:${hostname}`,
          action: "agent_enrolled",
          target: hostname,
          details: { os, agent_version: agentVersion },
        });

        return json({ endpoint_id: endpointId, device_token: token });
      },
    },
  },
});
