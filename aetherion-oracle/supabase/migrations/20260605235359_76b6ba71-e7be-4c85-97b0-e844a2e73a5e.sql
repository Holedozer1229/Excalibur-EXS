CREATE TABLE IF NOT EXISTS public.dream_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  dream_id uuid NOT NULL REFERENCES public.dreams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dream_shares TO authenticated;
GRANT ALL ON public.dream_shares TO service_role;

ALTER TABLE public.dream_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read own shares"
  ON public.dream_shares FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners delete own shares"
  ON public.dream_shares FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS dream_shares_dream_idx ON public.dream_shares (dream_id);
CREATE INDEX IF NOT EXISTS dream_shares_user_idx ON public.dream_shares (user_id);
CREATE UNIQUE INDEX IF NOT EXISTS dream_shares_one_per_dream ON public.dream_shares (dream_id);