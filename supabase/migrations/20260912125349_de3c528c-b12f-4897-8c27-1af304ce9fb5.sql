
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('admin','analyst');
CREATE TYPE public.severity_level AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE public.incident_status AS ENUM ('open','acknowledged','investigating','contained','closed');

-- ORGANIZATIONS
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  enroll_key text NOT NULL DEFAULT replace(gen_random_uuid()::text,'-','') ,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'analyst',
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HELPERS
CREATE OR REPLACE FUNCTION public.current_org()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "own org readable" ON public.organizations FOR SELECT TO authenticated USING (id = public.current_org());
CREATE POLICY "own org updatable" ON public.organizations FOR UPDATE TO authenticated USING (id = public.current_org());
CREATE POLICY "own profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR organization_id = public.current_org());
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

-- ENDPOINTS
CREATE TABLE public.endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  hostname text NOT NULL,
  os text NOT NULL DEFAULT 'unknown',
  agent_version text NOT NULL DEFAULT '0.0.0',
  last_heartbeat timestamptz,
  status text NOT NULL DEFAULT 'offline',
  risk_level public.severity_level NOT NULL DEFAULT 'LOW',
  isolated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.endpoints TO authenticated;
GRANT ALL ON public.endpoints TO service_role;
ALTER TABLE public.endpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org endpoints" ON public.endpoints FOR ALL TO authenticated USING (organization_id = public.current_org()) WITH CHECK (organization_id = public.current_org());

-- DEVICE TOKENS
CREATE TABLE public.device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.endpoints ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX device_tokens_hash_idx ON public.device_tokens (token_hash);
GRANT ALL ON public.device_tokens TO service_role;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- DETECTION RULES
CREATE TABLE public.detection_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  rule_key text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  severity public.severity_level NOT NULL DEFAULT 'MEDIUM',
  weight integer NOT NULL DEFAULT 10,
  enabled boolean NOT NULL DEFAULT true,
  logic_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, rule_key)
);
GRANT SELECT, INSERT, UPDATE ON public.detection_rules TO authenticated;
GRANT ALL ON public.detection_rules TO service_role;
ALTER TABLE public.detection_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org rules" ON public.detection_rules FOR ALL TO authenticated USING (organization_id = public.current_org()) WITH CHECK (organization_id = public.current_org());

-- INCIDENTS
CREATE SEQUENCE public.incident_code_seq START 124;
CREATE TABLE public.incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  incident_code text NOT NULL UNIQUE DEFAULT 'AX-' || lpad(nextval('public.incident_code_seq')::text, 6, '0'),
  severity public.severity_level NOT NULL DEFAULT 'LOW',
  risk_score integer NOT NULL DEFAULT 0,
  status public.incident_status NOT NULL DEFAULT 'open',
  title text NOT NULL DEFAULT 'Suspicious activity detected',
  summary text,
  endpoint_id uuid REFERENCES public.endpoints ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incidents TO authenticated;
GRANT ALL ON public.incidents TO service_role;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org incidents" ON public.incidents FOR ALL TO authenticated USING (organization_id = public.current_org()) WITH CHECK (organization_id = public.current_org());

-- EVENTS
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES public.endpoints ON DELETE CASCADE,
  event_type text NOT NULL,
  timestamp timestamptz NOT NULL DEFAULT now(),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ingested_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_endpoint_time_idx ON public.events (endpoint_id, timestamp DESC);
GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org events" ON public.events FOR SELECT TO authenticated USING (organization_id = public.current_org());

-- DETECTIONS
CREATE TABLE public.detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  rule_id text NOT NULL,
  incident_id uuid NOT NULL REFERENCES public.incidents ON DELETE CASCADE,
  confidence numeric NOT NULL DEFAULT 0,
  severity public.severity_level NOT NULL DEFAULT 'LOW',
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.detections TO authenticated;
GRANT ALL ON public.detections TO service_role;
ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org detections" ON public.detections FOR SELECT TO authenticated USING (organization_id = public.current_org());

-- INCIDENT EVENTS
CREATE TABLE public.incident_events (
  incident_id uuid NOT NULL REFERENCES public.incidents ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  PRIMARY KEY (incident_id, event_id)
);
GRANT SELECT ON public.incident_events TO authenticated;
GRANT ALL ON public.incident_events TO service_role;
ALTER TABLE public.incident_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org incident events" ON public.incident_events FOR SELECT TO authenticated USING (organization_id = public.current_org());

-- MITRE MAPPINGS
CREATE TABLE public.mitre_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  incident_id uuid NOT NULL REFERENCES public.incidents ON DELETE CASCADE,
  technique_id text NOT NULL,
  technique_name text NOT NULL,
  evidence text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mitre_mappings TO authenticated;
GRANT ALL ON public.mitre_mappings TO service_role;
ALTER TABLE public.mitre_mappings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org mitre" ON public.mitre_mappings FOR SELECT TO authenticated USING (organization_id = public.current_org());

-- RESPONSE ACTIONS
CREATE TABLE public.response_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents ON DELETE CASCADE,
  endpoint_id uuid REFERENCES public.endpoints ON DELETE SET NULL,
  action_type text NOT NULL,
  target jsonb NOT NULL DEFAULT '{}'::jsonb,
  requested_by text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  result text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.response_actions TO authenticated;
GRANT ALL ON public.response_actions TO service_role;
ALTER TABLE public.response_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org actions" ON public.response_actions FOR ALL TO authenticated USING (organization_id = public.current_org()) WITH CHECK (organization_id = public.current_org());

-- AUDIT LOGS
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  incident_id uuid REFERENCES public.incidents ON DELETE CASCADE,
  actor text NOT NULL,
  action text NOT NULL,
  target text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org audit" ON public.audit_logs FOR ALL TO authenticated USING (organization_id = public.current_org()) WITH CHECK (organization_id = public.current_org());

-- SEED RULES PER ORG
CREATE OR REPLACE FUNCTION public.seed_detection_rules(_org uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.detection_rules (organization_id, rule_key, name, description, severity, weight) VALUES
    (_org,'office_to_powershell','Office application spawning PowerShell','An Office process (Word, Excel, Outlook) launched PowerShell, a common macro-based initial access pattern.','HIGH',30),
    (_org,'encoded_powershell','Encoded PowerShell command','PowerShell executed with -enc / -EncodedCommand, used to obfuscate malicious script content.','HIGH',25),
    (_org,'suspicious_parent_child','Suspicious parent-child process chain','A known-bad parent/child process relationship was observed.','MEDIUM',15),
    (_org,'temp_path_exec','Execution from user-writable temp path','A binary executed from a Temp or AppData path, typical of dropped payloads.','MEDIUM',15),
    (_org,'unusual_outbound','Unusual outbound network connection','A process established an outbound connection on a non-standard port shortly after launch.','MEDIUM',20),
    (_org,'known_test_hash','Known test indicator hash match','The file hash matches a known test/malicious indicator.','CRITICAL',40)
  ON CONFLICT (organization_id, rule_key) DO NOTHING;
END;
$$;

-- NEW USER BOOTSTRAP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _org uuid;
  _is_demo boolean := (NEW.email = 'demo.analyst@aegisx.app');
BEGIN
  INSERT INTO public.organizations (name, is_demo)
  VALUES (CASE WHEN _is_demo THEN 'AegisX Demo Org' ELSE coalesce(split_part(NEW.email,'@',2),'My Organization') END, _is_demo)
  RETURNING id INTO _org;

  INSERT INTO public.profiles (id, email, full_name, role, organization_id)
  VALUES (NEW.id, NEW.email, coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), 'analyst', _org);

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role)
  ON CONFLICT DO NOTHING;

  PERFORM public.seed_detection_rules(_org);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER incidents_touch BEFORE UPDATE ON public.incidents FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER actions_touch BEFORE UPDATE ON public.response_actions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- REALTIME
ALTER TABLE public.incidents REPLICA IDENTITY FULL;
ALTER TABLE public.endpoints REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE public.endpoints;
