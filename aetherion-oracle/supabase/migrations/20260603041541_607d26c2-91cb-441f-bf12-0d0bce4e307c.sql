CREATE TABLE IF NOT EXISTS public.codex_state (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  state_seed BIGINT NOT NULL DEFAULT 0,
  run_count INTEGER NOT NULL DEFAULT 0,
  top_symbols JSONB NOT NULL DEFAULT '[]'::jsonb,
  dominant_symbol TEXT,
  global_entropy DOUBLE PRECISION,
  identity_stability DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, word)
);

GRANT SELECT ON public.codex_state TO authenticated;
GRANT ALL ON public.codex_state TO service_role;

ALTER TABLE public.codex_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own codex_state"
ON public.codex_state FOR SELECT
TO authenticated
USING (user_id = auth.uid());