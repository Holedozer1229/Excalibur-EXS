REVOKE ALL ON public.tarot_anonymous_usage FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.tarot_anonymous_usage TO service_role;

CREATE POLICY "Deny client select" ON public.tarot_anonymous_usage
  FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "Deny client insert" ON public.tarot_anonymous_usage
  FOR INSERT TO anon, authenticated WITH CHECK (false);
CREATE POLICY "Deny client update" ON public.tarot_anonymous_usage
  FOR UPDATE TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny client delete" ON public.tarot_anonymous_usage
  FOR DELETE TO anon, authenticated USING (false);