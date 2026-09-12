
REVOKE ALL ON FUNCTION public.seed_detection_rules(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.current_org() FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
CREATE POLICY "device tokens are server-only" ON public.device_tokens FOR SELECT TO authenticated USING (false);
