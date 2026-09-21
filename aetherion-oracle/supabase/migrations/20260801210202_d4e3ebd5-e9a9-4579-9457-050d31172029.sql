DROP POLICY IF EXISTS "Public can view inscribed tokens" ON public.brc20_tokens;

CREATE OR REPLACE VIEW public.brc20_tokens_public
WITH (security_invoker = off) AS
SELECT id, tick, network, max, lim, dec, status, reveal_tx, inscription_id, created_at
FROM public.brc20_tokens
WHERE status = 'inscribed';

GRANT SELECT ON public.brc20_tokens_public TO anon, authenticated;
GRANT ALL ON public.brc20_tokens_public TO service_role;