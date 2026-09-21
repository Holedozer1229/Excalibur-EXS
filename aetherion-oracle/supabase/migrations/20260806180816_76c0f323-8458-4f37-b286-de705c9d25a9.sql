REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.learn_articles FROM anon, authenticated;
GRANT SELECT ON public.learn_articles TO anon, authenticated;
GRANT ALL ON public.learn_articles TO service_role;

REVOKE ALL ON public.media_generations FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.media_generations FROM authenticated;
GRANT SELECT ON public.media_generations TO authenticated;
GRANT ALL ON public.media_generations TO service_role;