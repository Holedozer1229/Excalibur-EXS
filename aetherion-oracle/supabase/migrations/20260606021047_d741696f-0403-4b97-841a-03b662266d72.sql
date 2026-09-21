
CREATE TABLE IF NOT EXISTS public.media_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  dream_id UUID,
  kind TEXT NOT NULL CHECK (kind IN ('image','video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  prediction_id TEXT,
  storage_path TEXT,
  output_url TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS media_generations_user_created_idx ON public.media_generations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS media_generations_dream_idx ON public.media_generations(dream_id);

GRANT SELECT ON public.media_generations TO authenticated;
GRANT ALL ON public.media_generations TO service_role;

ALTER TABLE public.media_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own media generations"
ON public.media_generations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.media_quota_used_this_month(_user_id UUID)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.media_generations
  WHERE user_id = _user_id
    AND status IN ('pending','completed')
    AND created_at >= date_trunc('month', now());
$$;

GRANT EXECUTE ON FUNCTION public.media_quota_used_this_month(UUID) TO authenticated, service_role;
