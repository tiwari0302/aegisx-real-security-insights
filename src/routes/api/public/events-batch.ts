import { createFileRoute } from "@tanstack/react-router";
import { authenticateDevice, json, rateLimit } from "@/lib/agent-auth.server";
import { ingestAndDetect, validateEvents } from "@/lib/pipeline.server";

export const Route = createFileRoute("/api/public/events-batch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const device = await authenticateDevice(supabaseAdmin, request);
        if (!device) return json({ error: "unauthorized" }, 401);
        if (!rateLimit(`events:${device.endpointId}`, 60))
          return json({ error: "rate_limited" }, 429);

        let body: Record<string, unknown>;
        try {
          body = (await request.json()) as Record<string, unknown>;
        } catch {
          return json({ error: "invalid_json" }, 400);
        }

        const endpointId = String(body["endpoint_id"] ?? device.endpointId);
        if (endpointId !== device.endpointId) return json({ error: "endpoint_mismatch" }, 403);

        let events;
        try {
          events = validateEvents(body["events"]);
        } catch (err) {
          return json({ error: err instanceof Error ? err.message : "invalid_events" }, 400);
        }

        try {
          const result = await ingestAndDetect(supabaseAdmin, {
            organizationId: device.organizationId,
            endpointId: device.endpointId,
            events,
            actor: `agent:${device.endpointId}`,
          });
          return json({ inserted: result.inserted, incidents_created: result.incidents_created });
        } catch (err) {
          console.error("events-batch failed", err);
          return json({ error: err instanceof Error ? err.message : "ingest_failed" }, 500);
        }
      },
    },
  },
});
