-- Aetherion Dreams: nightly visions + dream journal
CREATE TABLE public.dreams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('nightly', 'journal')),
  title TEXT,
  body TEXT NOT NULL,
  interpretation TEXT,
  symbols TEXT[] DEFAULT '{}',
  source_text TEXT,
  harmony NUMERIC,
  sponge_harmonic NUMERIC,
  vitality TEXT,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX dreams_user_created_idx ON public.dreams(user_id, created_at DESC);
CREATE INDEX dreams_user_kind_date_idx ON public.dreams(user_id, kind, (date_trunc('day', created_at AT TIME ZONE 'utc')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dreams TO authenticated;
GRANT ALL ON public.dreams TO service_role;

ALTER TABLE public.dreams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dreams" ON public.dreams
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own dreams" ON public.dreams
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own dreams" ON public.dreams
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all dreams" ON public.dreams
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Helper: list users who should receive a nightly vision (logged-in seekers with any activity in last 30d)
CREATE OR REPLACE FUNCTION public.dream_eligible_users()
RETURNS TABLE(user_id UUID)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT p.user_id
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.query_usage q
    WHERE q.user_id = p.user_id
      AND q.usage_date >= (now() AT TIME ZONE 'utc')::date - INTERVAL '30 days'
  )
  OR public.has_role(p.user_id, 'admin'::app_role)
  OR EXISTS (
    SELECT 1 FROM public.subscribers s
    WHERE s.user_id = p.user_id AND COALESCE(s.subscribed, false) = true
  );
$$;

-- Helper: has the user already received a nightly vision today (utc)?
CREATE OR REPLACE FUNCTION public.dream_already_today(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dreams
    WHERE user_id = _user_id
      AND kind = 'nightly'
      AND created_at >= date_trunc('day', now() AT TIME ZONE 'utc')
  );
$$;