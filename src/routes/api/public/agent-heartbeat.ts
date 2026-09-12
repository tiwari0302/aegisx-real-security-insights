import { createFileRoute } from "@tanstack/react-router";
import { authenticateDevice, json, rateLimit } from "@/lib/agent-auth.server";

export const Route = createFileRoute("/api/public/agent-heartbeat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const device = await authenticateDevice(supabaseAdmin, request);
        if (!device) return json({ error: "unauthorized" }, 401);
        if (!rateLimit(`hb:${device.endpointId}`, 60)) return json({ error: "rate_limited" }, 429);

        let body: Record<string, unknown> = {};
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          body = {};
        }
        const endpointId = String(body["endpoint_id"] ?? device.endpointId);
        if (endpointId !== device.endpointId) return json({ error: "endpoint_mismatch" }, 403);

        const ts = typeof body["timestamp"] === "string" ? String(body["timestamp"]) : null;
        const heartbeat = ts && !Number.isNaN(Date.parse(ts)) ? new Date(ts).toISOString() : new Date().toISOString();

        await supabaseAdmin
          .from("endpoints")
          .update({ last_heartbeat: heartbeat, status: "online" })
          .eq("id", device.endpointId);

        // Opportunistic reaper: any endpoint in this org silent for >2 minutes is offline.
        const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        await supabaseAdmin
          .from("endpoints")
          .update({ status: "offline" })
          .eq("organization_id", device.organizationId)
          .eq("status", "online")
          .lt("last_heartbeat", cutoff);

        return json({ ok: true });
      },
    },
  },
});
