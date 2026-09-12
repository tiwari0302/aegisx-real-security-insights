import { createFileRoute } from "@tanstack/react-router";
import { authenticateDevice, json, rateLimit } from "@/lib/agent-auth.server";

export const Route = createFileRoute("/api/public/agent-commands")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const device = await authenticateDevice(supabaseAdmin, request);
        if (!device) return json({ error: "unauthorized" }, 401);
        if (!rateLimit(`cmd:${device.endpointId}`, 120)) return json({ error: "rate_limited" }, 429);

        const requested = new URL(request.url).searchParams.get("endpoint_id");
        if (requested && requested !== device.endpointId) {
          return json({ error: "endpoint_mismatch" }, 403);
        }

        const { data } = await supabaseAdmin
          .from("response_actions")
          .select("id, action_type, target")
          .eq("endpoint_id", device.endpointId)
          .eq("status", "pending_agent")
          .order("created_at", { ascending: true });

        return json({
          commands: (data ?? []).map((row) => ({
            command_id: row.id,
            action_type: row.action_type,
            target: row.target ?? {},
          })),
        });
      },
    },
  },
});
