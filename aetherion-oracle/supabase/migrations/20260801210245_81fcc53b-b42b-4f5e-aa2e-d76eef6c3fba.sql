DROP VIEW IF EXISTS public.brc20_tokens_public;

CREATE OR REPLACE FUNCTION public.get_public_brc20_tokens(_tick text DEFAULT NULL, _network text DEFAULT 'mainnet')
RETURNS TABLE(
  id uuid, tick text, network text, max numeric, lim numeric, decimals integer,
  status text, reveal_tx text, inscription_id text, created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT t.id, t.tick, t.network, t.max, t.lim, t."dec",
         t.status, t.reveal_tx, t.inscription_id, t.created_at
  FROM public.brc20_tokens t
  WHERE t.status = 'inscribed'
    AND (_tick IS NULL OR t.tick = upper(_tick))
    AND (_network IS NULL OR t.network = _network)
  ORDER BY t.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_brc20_tokens(text, text) TO anon, authenticated, service_role;