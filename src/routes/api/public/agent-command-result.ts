import { createFileRoute } from "@tanstack/react-router";
import { authenticateDevice, json, rateLimit } from "@/lib/agent-auth.server";

export const Route = createFileRoute("/api/public/agent-command-result")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const device = await authenticateDevice(supabaseAdmin, request);
        if (!device) return json({ error: "unauthorized" }, 401);
        if (!rateLimit(`cmdres:${device.endpointId}`, 120))
          return json({ error: "rate_limited" }, 429);

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const commandId = String(body["command_id"] ?? "");
        const status = String(body["status"] ?? "");
        const result = String(body["result"] ?? "").slice(0, 2000);
        if (!commandId) return json({ error: "command_id is required" }, 400);
        if (status !== "success" && status !== "failed") {
          return json({ error: "status must be success or failed" }, 400);
        }

        const { data: action } = await supabaseAdmin
          .from("response_actions")
          .select("id, incident_id, action_type, endpoint_id")
          .eq("id", commandId)
          .eq("endpoint_id", device.endpointId)
          .maybeSingle();
        if (!action) return json({ error: "command_not_found" }, 404);

        await supabaseAdmin
          .from("response_actions")
          .update({ status: status === "success" ? "completed" : "failed", result })
          .eq("id", commandId);

        await supabaseAdmin.from("audit_logs").insert({
          organization_id: device.organizationId,
          incident_id: action.incident_id,
          actor: `agent:${device.endpointId}`,
          action: `command_${status}`,
          target: action.action_type,
          details: { command_id: commandId, result },
        });

        return json({ ok: true });
      },
    },
  },
});
