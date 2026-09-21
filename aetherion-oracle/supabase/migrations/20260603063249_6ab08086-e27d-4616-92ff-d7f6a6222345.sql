
-- Structured log of tier/usage RPC failures (whenever an edge function
-- degrades to the seeker default). Used to track fallback frequency and
-- power threshold-based alerting.
CREATE TABLE public.rpc_failure_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  function_name TEXT NOT NULL,           -- e.g. 'aetherion', 'user-state'
  rpc_name TEXT NOT NULL,                -- e.g. 'consume_query_quota', 'get_user_tier_state'
  failure_kind TEXT NOT NULL,            -- 'rpc_error' | 'threw' | 'corrupted_payload' | 'missing_row'
  fallback_tier TEXT NOT NULL DEFAULT 'seeker',
  error_code TEXT,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rpc_failure_log TO authenticated;
GRANT ALL ON public.rpc_failure_log TO service_role;

ALTER TABLE public.rpc_failure_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the failure log (operational telemetry).
CREATE POLICY "Admins read rpc failures"
  ON public.rpc_failure_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Inserts are service-role only (edge functions write via service key).

CREATE INDEX idx_rpc_failure_log_created_at ON public.rpc_failure_log (created_at DESC);
CREATE INDEX idx_rpc_failure_log_function ON public.rpc_failure_log (function_name, rpc_name, created_at DESC);
CREATE INDEX idx_rpc_failure_log_user ON public.rpc_failure_log (user_id, created_at DESC);

-- Rolling stats helper for dashboards / alerting. Returns failure counts
-- bucketed by function+rpc over a sliding window. SECURITY DEFINER so the
-- admin client can call it without a direct table grant for everyone.
CREATE OR REPLACE FUNCTION public.rpc_failure_stats(_window_minutes INTEGER DEFAULT 60)
RETURNS TABLE (
  function_name TEXT,
  rpc_name TEXT,
  failure_kind TEXT,
  failures BIGINT,
  unique_users BIGINT,
  last_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    function_name,
    rpc_name,
    failure_kind,
    count(*)::BIGINT AS failures,
    count(DISTINCT user_id)::BIGINT AS unique_users,
    max(created_at) AS last_at
  FROM public.rpc_failure_log
  WHERE created_at >= now() - make_interval(mins => GREATEST(_window_minutes, 1))
    AND public.has_role(auth.uid(), 'admin'::app_role)  -- gate inside SECURITY DEFINER
  GROUP BY function_name, rpc_name, failure_kind
  ORDER BY failures DESC;
$$;

REVOKE ALL ON FUNCTION public.rpc_failure_stats(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rpc_failure_stats(INTEGER) TO authenticated;
