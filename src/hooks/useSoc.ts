import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { performResponseAction, sendTestTelemetry } from "@/lib/soc.functions";

export function useProfile() {
  // If a profile row is momentarily missing right after signup, retry a
  // few times instead of immediately treating it as "not authenticated".
  // Also keep polling briefly in case the DB trigger is still catching up.
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, organization_id, organizations(name, enroll_key, is_demo)")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    retry: (failureCount) => failureCount < 3,
    retryDelay: 700,
    refetchInterval: (query) => {
      // Poll a handful of times if we got a successful-but-null result
      // (session exists, no profile row yet) — then stop and let the UI
      // show a manual retry instead of spinning forever.
      if (query.state.data !== null) return false;
      return query.state.dataUpdateCount < 5 ? 1500 : false;
    },
  });
}

export function useIncidents(filters?: { severity?: string; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["incidents", filters],
    queryFn: async () => {
      let query = supabase
        .from("incidents")
        .select("*, endpoints(hostname)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filters?.severity && filters.severity !== "all") {
        query = query.eq("severity", filters.severity as "LOW");
      }
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status as "open");
      }
      const { data, error } = await query;
      if (error) throw error;
      const rows = data ?? [];
      const term = filters?.search?.trim().toLowerCase();
      if (!term) return rows;
      return rows.filter(
        (r) =>
          r.incident_code.toLowerCase().includes(term) ||
          r.title.toLowerCase().includes(term) ||
          (r.endpoints?.hostname ?? "").toLowerCase().includes(term),
      );
    },
  });
}

export function useIncident(incidentId: string) {
  return useQuery({
    queryKey: ["incident", incidentId],
    queryFn: async () => {
      const [incident, detections, mitre, actions, audit, links] = await Promise.all([
        supabase.from("incidents").select("*, endpoints(*)").eq("id", incidentId).maybeSingle(),
        supabase.from("detections").select("*").eq("incident_id", incidentId).order("created_at", { ascending: false }),
        supabase.from("mitre_mappings").select("*").eq("incident_id", incidentId),
        supabase.from("response_actions").select("*").eq("incident_id", incidentId).order("created_at", { ascending: false }),
        supabase.from("audit_logs").select("*").eq("incident_id", incidentId).order("created_at", { ascending: false }),
        supabase.from("incident_events").select("event_id").eq("incident_id", incidentId),
      ]);

      const eventIds = (links.data ?? []).map((l) => l.event_id);
      const events = eventIds.length
        ? (await supabase.from("events").select("*").in("id", eventIds).order("timestamp", { ascending: true })).data ?? []
        : [];

      return {
        incident: incident.data,
        detections: detections.data ?? [],
        mitre: mitre.data ?? [],
        actions: actions.data ?? [],
        audit: audit.data ?? [],
        events,
      };
    },
  });
}

export function useEndpoints() {
  return useQuery({
    queryKey: ["endpoints"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("endpoints")
        .select("*")
        .order("hostname", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Real KPI counts + 7-day severity trend, computed from live incidents/endpoints — no hardcoded numbers. */
export function useOverviewStats() {
  return useQuery({
    queryKey: ["overview"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [incidentsRes, endpointsRes, recentRes] = await Promise.all([
        supabase.from("incidents").select("id, severity, status, created_at").gte("created_at", since),
        supabase.from("endpoints").select("id, status"),
        supabase
          .from("incidents")
          .select("*, endpoints(hostname)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);
      if (incidentsRes.error) throw incidentsRes.error;
      if (endpointsRes.error) throw endpointsRes.error;
      if (recentRes.error) throw recentRes.error;

      const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
      for (const row of incidentsRes.data ?? []) {
        counts[row.severity as keyof typeof counts] += 1;
      }

      const online = (endpointsRes.data ?? []).filter((e) => e.status === "online").length;
      const offline = (endpointsRes.data ?? []).length - online;

      // Bucket the last 7 days by local date for the trend chart.
      const days: { date: string; CRITICAL: number; HIGH: number; MEDIUM: number; LOW: number }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ date: d.toISOString().slice(0, 10), CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 });
      }
      for (const row of incidentsRes.data ?? []) {
        const key = row.created_at.slice(0, 10);
        const bucket = days.find((d) => d.date === key);
        if (bucket) bucket[row.severity as "LOW"] += 1;
      }

      return {
        counts,
        online,
        offline,
        trend: days,
        recent: recentRes.data ?? [],
      };
    },
    refetchInterval: 30_000,
  });
}

export function useAuditLogs(search?: string) {
  return useQuery({
    queryKey: ["audit-logs", search],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*, incidents(incident_code)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      const rows = data ?? [];
      const term = search?.trim().toLowerCase();
      if (!term) return rows;
      return rows.filter(
        (r) =>
          r.actor.toLowerCase().includes(term) ||
          r.action.toLowerCase().includes(term) ||
          (r.target ?? "").toLowerCase().includes(term),
      );
    },
  });
}

export function useDetectionRules() {
  return useQuery({
    queryKey: ["detection-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detection_rules")
        .select("*")
        .order("weight", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleDetectionRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase.from("detection_rules").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["detection-rules"] }),
  });
}

export function useResponseActions() {
  return useQuery({
    queryKey: ["response-actions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("response_actions")
        .select("*, incidents(incident_code), endpoints(hostname)")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Pushes a real WINWORD→PowerShell(encoded)→outbound-connection chain through the live pipeline. */
export function useSendTestTelemetry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => sendTestTelemetry(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
      queryClient.invalidateQueries({ queryKey: ["endpoints"] });
    },
  });
}

export function usePerformResponseAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { incidentId: string; actionType: string; note?: string }) =>
      performResponseAction({ data: input }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["incident", variables.incidentId] });
      queryClient.invalidateQueries({ queryKey: ["incidents"] });
      queryClient.invalidateQueries({ queryKey: ["response-actions"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    },
  });
}

export function useEndpoint(endpointId: string) {
  return useQuery({
    queryKey: ["endpoint", endpointId],
    queryFn: async () => {
      const [endpoint, events, incidents] = await Promise.all([
        supabase.from("endpoints").select("*").eq("id", endpointId).maybeSingle(),
        supabase
          .from("events")
          .select("*")
          .eq("endpoint_id", endpointId)
          .order("timestamp", { ascending: false })
          .limit(50),
        supabase
          .from("incidents")
          .select("*")
          .eq("endpoint_id", endpointId)
          .order("created_at", { ascending: false }),
      ]);
      if (endpoint.error) throw endpoint.error;
      return {
        endpoint: endpoint.data,
        events: events.data ?? [],
        incidents: incidents.data ?? [],
      };
    },
    enabled: !!endpointId,
  });
}

/** Live incident + endpoint updates, no manual refresh needed. */
export function useRealtimeSoc() {
  const queryClient = useQueryClient();
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel("aegisx-soc")
      .on("postgres_changes", { event: "*", schema: "public", table: "incidents" }, () => {
        setLastEvent(new Date().toISOString());
        queryClient.invalidateQueries({ queryKey: ["incidents"] });
        queryClient.invalidateQueries({ queryKey: ["incident"] });
        queryClient.invalidateQueries({ queryKey: ["overview"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "endpoints" }, () => {
        setLastEvent(new Date().toISOString());
        queryClient.invalidateQueries({ queryKey: ["endpoints"] });
        queryClient.invalidateQueries({ queryKey: ["overview"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return lastEvent;
}
