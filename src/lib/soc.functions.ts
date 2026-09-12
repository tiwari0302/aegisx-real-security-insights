import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateEvents, ingestAndDetect } from "@/lib/pipeline.server";

const ALLOWED_ACTIONS = [
  "acknowledge",
  "assign",
  "mark_investigating",
  "simulate_isolate",
  "terminate_process",
] as const;
type ActionType = (typeof ALLOWED_ACTIONS)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function orgContext(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("organization_id, email")
    .eq("id", userId)
    .maybeSingle();
  if (!data) throw new Error("Profile not found");
  return {
    organizationId: data.organization_id as string,
    email: (data.email as string) ?? "analyst",
  };
}


/**
 * Test telemetry: pushes a realistic WINWORD -> POWERSHELL (encoded) -> outbound
 * connection chain through the exact same ingestion + detection path a real agent uses.
 */
export const sendTestTelemetry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { organizationId, email } = await orgContext(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Real endpoint row for the simulated workstation (created once, reused after).
    const hostname = "AX-TESTLAB-01";
    const { data: existing } = await supabaseAdmin
      .from("endpoints")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("hostname", hostname)
      .maybeSingle();

    let endpointId: string;
    if (existing?.id) {
      endpointId = existing.id as string;
      await supabaseAdmin
        .from("endpoints")
        .update({ status: "online", last_heartbeat: new Date().toISOString() })
        .eq("id", endpointId);
    } else {
      const { data: created, error } = await supabaseAdmin
        .from("endpoints")
        .insert({
          organization_id: organizationId,
          hostname,
          os: "Windows 11 Pro 23H2",
          agent_version: "0.9.0-test",
          status: "online",
          last_heartbeat: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      endpointId = created.id as string;
    }

    const now = Date.now();
    const iso = (offsetMs: number) => new Date(now + offsetMs).toISOString();
    const events = validateEvents([
      {
        event_type: "process_create",
        timestamp: iso(0),
        payload: {
          pid: 4820,
          process_name: "WINWORD.EXE",
          image_path: "C:\\Program Files\\Microsoft Office\\root\\Office16\\WINWORD.EXE",
          parent_process: "EXPLORER.EXE",
          command_line: '"WINWORD.EXE" /n "C:\\Users\\jdoe\\Downloads\\Q3-Invoice.docm"',
          user: "CORP\\jdoe",
        },
      },
      {
        event_type: "process_create",
        timestamp: iso(1200),
        payload: {
          pid: 6112,
          process_name: "POWERSHELL.EXE",
          image_path: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
          parent_process: "WINWORD.EXE",
          parent_pid: 4820,
          command_line:
            "powershell.exe -nop -w hidden -enc SQBFAFgAKABOAGUAdwAtAE8AYgBqAGUAYwB0ACAATgBlAHQALgBXAGUAYgBDAGwAaQBlAG4AdAApAA==",
          user: "CORP\\jdoe",
        },
      },
      {
        event_type: "file_write",
        timestamp: iso(2400),
        payload: {
          pid: 6112,
          process_name: "POWERSHELL.EXE",
          image_path: "C:\\Users\\jdoe\\AppData\\Local\\Temp\\svchost-update.exe",
          sha256: "275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f",
        },
      },
      {
        event_type: "network_connection",
        timestamp: iso(3600),
        payload: {
          pid: 6112,
          process_name: "POWERSHELL.EXE",
          dest_ip: "185.230.63.107",
          dest_port: 4444,
          protocol: "tcp",
          direction: "outbound",
        },
      },
    ]);

    const result = await ingestAndDetect(supabaseAdmin, {
      organizationId,
      endpointId,
      events,
      actor: email,
    });

    return {
      inserted: result.inserted,
      incidents_created: result.incidents_created,
      incidents_updated: result.incidents_updated,
      endpoint_id: endpointId,
    };
  });

/** Allowlisted response actions — every one persists an action, an audit entry and a status change. */
export const performResponseAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { incidentId: string; actionType: string; note?: string }) => {
    if (!input?.incidentId) throw new Error("incidentId is required");
    if (!ALLOWED_ACTIONS.includes(input.actionType as ActionType)) {
      throw new Error("Action not allowed");
    }
    return {
      incidentId: input.incidentId,
      actionType: input.actionType as ActionType,
      note: (input.note ?? "").slice(0, 500),
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { organizationId, email } = await orgContext(supabase, userId);

    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("id, incident_code, endpoint_id, status")
      .eq("id", data.incidentId)
      .maybeSingle();
    if (incidentError) throw new Error(incidentError.message);
    if (!incident) throw new Error("Incident not found");

    const statusByAction: Record<ActionType, string | null> = {
      acknowledge: "acknowledged",
      assign: "acknowledged",
      mark_investigating: "investigating",
      simulate_isolate: "contained",
      terminate_process: "investigating",
    };

    const needsAgent = data.actionType === "simulate_isolate" || data.actionType === "terminate_process";

    const target =
      data.actionType === "terminate_process"
        ? { process_name: "POWERSHELL.EXE", scope: "approved_test_process_only" }
        : { endpoint_id: incident.endpoint_id, incident_code: incident.incident_code };

    const { data: action, error: actionError } = await supabase
      .from("response_actions")
      .insert({
        organization_id: organizationId,
        incident_id: incident.id,
        endpoint_id: incident.endpoint_id,
        action_type: data.actionType,
        target,
        requested_by: email,
        status: needsAgent ? "pending_agent" : "completed",
        result: needsAgent ? null : "Applied in platform",
      })
      .select("id, status")
      .single();
    if (actionError) throw new Error(actionError.message);

    const nextStatus = statusByAction[data.actionType];
    if (nextStatus) {
      await supabase
        .from("incidents")
        .update(
          data.actionType === "assign"
            ? { status: nextStatus, assigned_to: userId }
            : { status: nextStatus },
        )
        .eq("id", incident.id);
    }


    if (data.actionType === "simulate_isolate" && incident.endpoint_id) {
      await supabase.from("endpoints").update({ isolated: true }).eq("id", incident.endpoint_id);
    }

    await supabase.from("audit_logs").insert({
      organization_id: organizationId,
      incident_id: incident.id,
      actor: email,
      action: data.actionType,
      target: incident.incident_code,
      details: { note: data.note, action_id: action.id, queued_for_agent: needsAgent },
    });

    return { actionId: action.id as string, status: action.status as string, incidentStatus: nextStatus };
  });
