import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, organization_id, organizations(name, enroll_key, is_demo)")
        .eq("id", auth.user.id)
        .maybeSingle();
      return data;
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
