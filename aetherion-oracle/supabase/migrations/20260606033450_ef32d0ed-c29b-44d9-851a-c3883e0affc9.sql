CREATE OR REPLACE FUNCTION public.public_stats()
RETURNS TABLE (
  readings_total bigint,
  readings_today bigint,
  dreams_total bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.divination_receipts) AS readings_total,
    (SELECT count(*) FROM public.divination_receipts WHERE issued_at >= date_trunc('day', now())) AS readings_today,
    (SELECT count(*) FROM public.dreams) AS dreams_total;
$$;

GRANT EXECUTE ON FUNCTION public.public_stats() TO anon, authenticated;