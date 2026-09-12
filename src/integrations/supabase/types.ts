export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor: string
          created_at: string
          details: Json
          id: string
          incident_id: string | null
          organization_id: string
          target: string | null
        }
        Insert: {
          action: string
          actor: string
          created_at?: string
          details?: Json
          id?: string
          incident_id?: string | null
          organization_id: string
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          details?: Json
          id?: string
          incident_id?: string | null
          organization_id?: string
          target?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      detection_rules: {
        Row: {
          created_at: string
          description: string
          enabled: boolean
          id: string
          logic_version: string
          name: string
          organization_id: string
          rule_key: string
          severity: Database["public"]["Enums"]["severity_level"]
          weight: number
        }
        Insert: {
          created_at?: string
          description: string
          enabled?: boolean
          id?: string
          logic_version?: string
          name: string
          organization_id: string
          rule_key: string
          severity?: Database["public"]["Enums"]["severity_level"]
          weight?: number
        }
        Update: {
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          logic_version?: string
          name?: string
          organization_id?: string
          rule_key?: string
          severity?: Database["public"]["Enums"]["severity_level"]
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "detection_rules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      detections: {
        Row: {
          confidence: number
          created_at: string
          id: string
          incident_id: string
          organization_id: string
          reasons: Json
          rule_id: string
          severity: Database["public"]["Enums"]["severity_level"]
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          incident_id: string
          organization_id: string
          reasons?: Json
          rule_id: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          incident_id?: string
          organization_id?: string
          reasons?: Json
          rule_id?: string
          severity?: Database["public"]["Enums"]["severity_level"]
        }
        Relationships: [
          {
            foreignKeyName: "detections_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      device_tokens: {
        Row: {
          created_at: string
          endpoint_id: string
          id: string
          organization_id: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          endpoint_id: string
          id?: string
          organization_id: string
          token_hash: string
        }
        Update: {
          created_at?: string
          endpoint_id?: string
          id?: string
          organization_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "device_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      endpoints: {
        Row: {
          agent_version: string
          created_at: string
          hostname: string
          id: string
          isolated: boolean
          last_heartbeat: string | null
          organization_id: string
          os: string
          risk_level: Database["public"]["Enums"]["severity_level"]
          status: string
        }
        Insert: {
          agent_version?: string
          created_at?: string
          hostname: string
          id?: string
          isolated?: boolean
          last_heartbeat?: string | null
          organization_id: string
          os?: string
          risk_level?: Database["public"]["Enums"]["severity_level"]
          status?: string
        }
        Update: {
          agent_version?: string
          created_at?: string
          hostname?: string
          id?: string
          isolated?: boolean
          last_heartbeat?: string | null
          organization_id?: string
          os?: string
          risk_level?: Database["public"]["Enums"]["severity_level"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "endpoints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          endpoint_id: string
          event_type: string
          id: string
          ingested_at: string
          organization_id: string
          payload: Json
          timestamp: string
        }
        Insert: {
          endpoint_id: string
          event_type: string
          id?: string
          ingested_at?: string
          organization_id: string
          payload?: Json
          timestamp?: string
        }
        Update: {
          endpoint_id?: string
          event_type?: string
          id?: string
          ingested_at?: string
          organization_id?: string
          payload?: Json
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          event_id: string
          incident_id: string
          organization_id: string
        }
        Insert: {
          event_id: string
          incident_id: string
          organization_id: string
        }
        Update: {
          event_id?: string
          incident_id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          assigned_to: string | null
          created_at: string
          endpoint_id: string | null
          id: string
          incident_code: string
          organization_id: string
          risk_score: number
          severity: Database["public"]["Enums"]["severity_level"]
          status: Database["public"]["Enums"]["incident_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          endpoint_id?: string | null
          id?: string
          incident_code?: string
          organization_id: string
          risk_score?: number
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          endpoint_id?: string | null
          id?: string
          incident_code?: string
          organization_id?: string
          risk_score?: number
          severity?: Database["public"]["Enums"]["severity_level"]
          status?: Database["public"]["Enums"]["incident_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidents_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mitre_mappings: {
        Row: {
          created_at: string
          evidence: string | null
          id: string
          incident_id: string
          organization_id: string
          technique_id: string
          technique_name: string
        }
        Insert: {
          created_at?: string
          evidence?: string | null
          id?: string
          incident_id: string
          organization_id: string
          technique_id: string
          technique_name: string
        }
        Update: {
          created_at?: string
          evidence?: string | null
          id?: string
          incident_id?: string
          organization_id?: string
          technique_id?: string
          technique_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "mitre_mappings_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mitre_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          enroll_key: string
          id: string
          is_demo: boolean
          name: string
        }
        Insert: {
          created_at?: string
          enroll_key?: string
          id?: string
          is_demo?: boolean
          name: string
        }
        Update: {
          created_at?: string
          enroll_key?: string
          id?: string
          is_demo?: boolean
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          organization_id: string
          role: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          organization_id: string
          role?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          organization_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      response_actions: {
        Row: {
          action_type: string
          created_at: string
          endpoint_id: string | null
          id: string
          incident_id: string | null
          organization_id: string
          requested_by: string
          result: string | null
          status: string
          target: Json
          updated_at: string
        }
        Insert: {
          action_type: string
          created_at?: string
          endpoint_id?: string | null
          id?: string
          incident_id?: string | null
          organization_id: string
          requested_by: string
          result?: string | null
          status?: string
          target?: Json
          updated_at?: string
        }
        Update: {
          action_type?: string
          created_at?: string
          endpoint_id?: string | null
          id?: string
          incident_id?: string | null
          organization_id?: string
          requested_by?: string
          result?: string | null
          status?: string
          target?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "response_actions_endpoint_id_fkey"
            columns: ["endpoint_id"]
            isOneToOne: false
            referencedRelation: "endpoints"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "response_actions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seed_detection_rules: { Args: { _org: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "analyst"
      incident_status:
        | "open"
        | "acknowledged"
        | "investigating"
        | "contained"
        | "closed"
      severity_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "analyst"],
      incident_status: [
        "open",
        "acknowledged",
        "investigating",
        "contained",
        "closed",
      ],
      severity_level: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
    },
  },
} as const
