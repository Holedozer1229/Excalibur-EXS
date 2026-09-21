
-- ============ funnel_events ============
CREATE TABLE public.funnel_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  ref_code TEXT,
  path TEXT,
  referrer TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.funnel_events TO authenticated;
GRANT ALL ON public.funnel_events TO service_role;

ALTER TABLE public.funnel_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all funnel events"
  ON public.funnel_events FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No INSERT/UPDATE/DELETE policy for authenticated:
-- writes must go through the track-funnel-event edge function (service role).

CREATE INDEX idx_funnel_events_event_name ON public.funnel_events(event_name);
CREATE INDEX idx_funnel_events_session_id ON public.funnel_events(session_id);
CREATE INDEX idx_funnel_events_utm_source ON public.funnel_events(utm_source);
CREATE INDEX idx_funnel_events_created_at ON public.funnel_events(created_at DESC);

-- ============ waitlist ============
CREATE TABLE public.waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  source TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  ref_code TEXT,
  session_id TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  converted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.waitlist TO authenticated;
GRANT ALL ON public.waitlist TO service_role;

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all waitlist rows"
  ON public.waitlist FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_waitlist_utm_source ON public.waitlist(utm_source);
CREATE INDEX idx_waitlist_created_at ON public.waitlist(created_at DESC);

CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON public.waitlist
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ admin aggregation RPC ============
CREATE OR REPLACE FUNCTION public.funnel_summary(_window_days INT DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _since TIMESTAMPTZ := now() - make_interval(days => GREATEST(_window_days, 1));
  _by_event JSONB;
  _by_source JSONB;
  _funnel JSONB;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT COALESCE(jsonb_object_agg(event_name, c), '{}'::jsonb)
  INTO _by_event
  FROM (
    SELECT event_name, count(*)::INT AS c
    FROM public.funnel_events
    WHERE created_at >= _since
    GROUP BY event_name
  ) t;

  SELECT COALESCE(jsonb_object_agg(COALESCE(utm_source, 'direct'), c), '{}'::jsonb)
  INTO _by_source
  FROM (
    SELECT utm_source, count(DISTINCT session_id)::INT AS c
    FROM public.funnel_events
    WHERE created_at >= _since AND event_name = 'lp_visit'
    GROUP BY utm_source
  ) t;

  _funnel := jsonb_build_object(
    'visits',     COALESCE((_by_event->>'lp_visit')::INT, 0),
    'casts',      COALESCE((_by_event->>'lp_cast_completed')::INT, 0),
    'waitlist',   COALESCE((_by_event->>'waitlist_submitted')::INT, 0),
    'signups',    COALESCE((_by_event->>'auth_completed')::INT, 0),
    'paid',       COALESCE((_by_event->>'first_paid_conversion')::INT, 0)
  );

  RETURN jsonb_build_object(
    'window_days', _window_days,
    'since', _since,
    'by_event', _by_event,
    'visits_by_source', _by_source,
    'funnel', _funnel,
    'waitlist_total', (SELECT count(*) FROM public.waitlist WHERE created_at >= _since)
  );
END;
$$;
