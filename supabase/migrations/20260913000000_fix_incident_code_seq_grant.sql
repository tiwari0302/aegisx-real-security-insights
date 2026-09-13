-- Fix: the original migration granted INSERT on public.incidents to the
-- `authenticated` role, but never granted USAGE on the sequence backing the
-- incident_code column's default (nextval(...) runs as the querying role,
-- not the table owner). Without this grant, any authenticated-role insert
-- into incidents fails with "permission denied for sequence incident_code_seq".

GRANT USAGE, SELECT ON SEQUENCE public.incident_code_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.incident_code_seq TO service_role;
