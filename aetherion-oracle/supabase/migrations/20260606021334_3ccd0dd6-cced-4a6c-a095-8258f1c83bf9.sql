
CREATE OR REPLACE FUNCTION public.find_echo_reading(
  _card_names TEXT[],
  _phase TEXT,
  _exclude_nonce TEXT
)
RETURNS TABLE (
  cards JSONB,
  phase TEXT,
  tension NUMERIC,
  issued_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dr.cards,
    (dr.quantum->>'aetherion_phase')::text AS phase,
    ((dr.quantum->>'topological_tension')::numeric) AS tension,
    dr.issued_at
  FROM public.divination_receipts dr
  WHERE dr.nonce <> COALESCE(_exclude_nonce, '')
    AND dr.issued_at > now() - interval '180 days'
    AND (dr.quantum->>'aetherion_phase') = _phase
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(dr.cards) c
      WHERE (c->>'name') = ANY(_card_names)
    )
  ORDER BY dr.issued_at DESC
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_echo_reading(TEXT[], TEXT, TEXT) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.phase_of_the_hour()
RETURNS TABLE (
  phase TEXT,
  cnt BIGINT,
  total BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH recent AS (
    SELECT COALESCE(quantum->>'aetherion_phase', 'UNKNOWN') AS phase
    FROM public.divination_receipts
    WHERE issued_at > now() - interval '1 hour'
  ),
  agg AS (
    SELECT phase, COUNT(*)::bigint AS cnt FROM recent GROUP BY phase
  )
  SELECT
    agg.phase,
    agg.cnt,
    (SELECT COUNT(*)::bigint FROM recent) AS total
  FROM agg
  ORDER BY cnt DESC;
$$;

GRANT EXECUTE ON FUNCTION public.phase_of_the_hour() TO anon, authenticated, service_role;
