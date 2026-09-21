CREATE TABLE public.oracle_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  query TEXT,
  response TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  glyph TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.oracle_history TO authenticated;
GRANT ALL ON public.oracle_history TO service_role;

ALTER TABLE public.oracle_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own oracle history"
  ON public.oracle_history
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read all oracle history"
  ON public.oracle_history
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX oracle_history_user_created_idx
  ON public.oracle_history (user_id, created_at DESC);