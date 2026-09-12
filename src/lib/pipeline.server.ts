/**
 * Server-only ingestion pipeline: validate → insert events → correlate →
 * score → MITRE map → AI summary → persist incident/detections.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CORRELATION_WINDOW_MS,
  evaluateRules,
  incidentTitle,
  mapToMitre,
  scoreIncident,
  type IngestEvent,
} from "./detection";

export interface IngestResult {
  inserted: number;
  incidents_created: string[];
  incidents_updated: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any, "public", any>;

export function validateEvents(input: unknown): IngestEvent[] {
  if (!Array.isArray(input)) throw new Error("events must be an array");
  if (input.length === 0) throw new Error("events must not be empty");
  if (input.length > 500) throw new Error("too many events in one batch (max 500)");
  return input.map((raw, i) => {
    const e = raw as Record<string, unknown>;
    const type = typeof e["event_type"] === "string" ? (e["event_type"] as string) : "";
    if (!type) throw new Error(`events[${i}].event_type is required`);
    const ts = typeof e["timestamp"] === "string" ? (e["timestamp"] as string) : new Date().toISOString();
    if (Number.isNaN(Date.parse(ts))) throw new Error(`events[${i}].timestamp is not a valid ISO date`);
    const payload = e["payload"];
    if (payload !== undefined && (typeof payload !== "object" || payload === null || Array.isArray(payload))) {
      throw new Error(`events[${i}].payload must be an object`);
    }
    return {
      event_type: type.slice(0, 64),
      timestamp: new Date(ts).toISOString(),
      payload: (payload ?? {}) as Record<string, unknown>,
    };
  });
}

async function aiSummary(params: {
  title: string;
  severity: string;
  score: number;
  hostname: string;
  reasons: { rule: string; description: string; evidence: string }[];
  events: IngestEvent[];
}): Promise<string | null> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return null;

  const evidence = {
    endpoint: params.hostname,
    severity: params.severity,
    risk_score: params.score,
    matched_rules: params.reasons,
    events: params.events.slice(0, 25).map((e) => ({
      type: e.event_type,
      timestamp: e.timestamp,
      payload: e.payload,
    })),
  };

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-3.8-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a senior SOC analyst. Given structured detection evidence, write a concise incident summary for a tier-1 analyst: 3-5 sentences covering what happened, why it is suspicious, likely attacker objective, and the recommended next containment step. No markdown headings, no bullet lists, plain prose.",
          },
          { role: "user", content: JSON.stringify(evidence) },
        ],
      }),
    });
    if (!res.ok) {
      console.error("AI summary failed", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error("AI summary error", err);
    return null;
  }
}

/**
 * Full pipeline. `db` must be a service-role client (agent route) or an
 * authenticated org-scoped client (test telemetry panel).
 */
export async function ingestAndDetect(
  db: Db,
  args: { organizationId: string; endpointId: string; events: IngestEvent[]; actor: string },
): Promise<IngestResult> {
  const { organizationId, endpointId, actor } = args;
  const events = args.events;

  const { data: insertedRows, error: insertError } = await db
    .from("events")
    .insert(
      events.map((e) => ({
        organization_id: organizationId,
        endpoint_id: endpointId,
        event_type: e.event_type,
        timestamp: e.timestamp,
        payload: e.payload,
      })),
    )
    .select("id, event_type, timestamp, payload");
  if (insertError) throw new Error(insertError.message);
  const inserted = insertedRows ?? [];

  // Correlation window: pull all events for this endpoint in the last 5 minutes.
  const windowStart = new Date(Date.now() - CORRELATION_WINDOW_MS).toISOString();
  const { data: windowRows } = await db
    .from("events")
    .select("id, event_type, timestamp, payload")
    .eq("endpoint_id", endpointId)
    .gte("timestamp", windowStart)
    .order("timestamp", { ascending: true });
  const correlated = (windowRows ?? []) as {
    id: string;
    event_type: string;
    timestamp: string;
    payload: Record<string, unknown>;
  }[];

  const { data: ruleRows } = await db
    .from("detection_rules")
    .select("rule_key, enabled")
    .eq("organization_id", organizationId);
  const enabled = (ruleRows ?? []).filter((r) => r.enabled).map((r) => r.rule_key as string);

  const matched = evaluateRules(correlated, enabled);
  if (matched.length === 0) {
    return { inserted: inserted.length, incidents_created: [], incidents_updated: [] };
  }

  const { score, severity, reasons, confidence } = scoreIncident(matched);
  const title = incidentTitle(matched);

  const { data: endpoint } = await db
    .from("endpoints")
    .select("hostname")
    .eq("id", endpointId)
    .maybeSingle();
  const hostname = (endpoint?.hostname as string) ?? "unknown-host";

  // Reuse an open incident for this endpoint inside the correlation window.
  const { data: existing } = await db
    .from("incidents")
    .select("id, risk_score")
    .eq("endpoint_id", endpointId)
    .in("status", ["open", "acknowledged", "investigating"])
    .gte("created_at", windowStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let incidentId: string;
  let created = false;

  if (existing?.id) {
    incidentId = existing.id as string;
    await db
      .from("incidents")
      .update({ risk_score: score, severity, title })
      .eq("id", incidentId);
  } else {
    const { data: newIncident, error: incidentError } = await db
      .from("incidents")
      .insert({
        organization_id: organizationId,
        endpoint_id: endpointId,
        severity,
        risk_score: score,
        title,
        status: "open",
      })
      .select("id")
      .single();
    if (incidentError) throw new Error(incidentError.message);
    incidentId = newIncident.id as string;
    created = true;
  }

  // Evidence linkage (real junction rows).
  await db.from("incident_events").upsert(
    correlated.map((e) => ({
      incident_id: incidentId,
      event_id: e.id,
      organization_id: organizationId,
    })),
    { onConflict: "incident_id,event_id" },
  );

  // Detections with the exact computed reasons.
  await db.from("detections").insert({
    organization_id: organizationId,
    incident_id: incidentId,
    rule_id: matched.map((m) => m.rule).join(","),
    confidence,
    severity,
    reasons,
  });

  // MITRE mappings — only real technique matches, de-duplicated per incident.
  const techniques = mapToMitre(matched);
  if (techniques.length > 0) {
    const { data: existingMitre } = await db
      .from("mitre_mappings")
      .select("technique_id")
      .eq("incident_id", incidentId);
    const have = new Set((existingMitre ?? []).map((m) => m.technique_id as string));
    const fresh = techniques.filter((t) => !have.has(t.technique_id));
    if (fresh.length > 0) {
      await db.from("mitre_mappings").insert(
        fresh.map((t) => ({
          organization_id: organizationId,
          incident_id: incidentId,
          technique_id: t.technique_id,
          technique_name: t.technique_name,
          evidence: t.evidence,
        })),
      );
    }
  }

  // Endpoint risk reflects its worst live incident.
  await db.from("endpoints").update({ risk_level: severity }).eq("id", endpointId);

  const summary = await aiSummary({
    title,
    severity,
    score,
    hostname,
    reasons,
    events: correlated,
  });
  if (summary) {
    await db.from("incidents").update({ summary }).eq("id", incidentId);
  }

  await db.from("audit_logs").insert({
    organization_id: organizationId,
    incident_id: incidentId,
    actor,
    action: created ? "incident_created" : "incident_correlated",
    target: hostname,
    details: {
      risk_score: score,
      severity,
      rules: matched.map((m) => m.rule),
      events_ingested: inserted.length,
    },
  });

  return {
    inserted: inserted.length,
    incidents_created: created ? [incidentId] : [],
    incidents_updated: created ? [] : [incidentId],
  };
}
