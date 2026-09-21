-- 1) Add tarot_credits to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tarot_credits INT NOT NULL DEFAULT 0;

-- 2) Anonymous-by-IP daily usage table
CREATE TABLE IF NOT EXISTS public.tarot_anonymous_usage (
  ip TEXT NOT NULL,
  usage_date DATE NOT NULL,
  cast_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ip, usage_date)
);

GRANT ALL ON public.tarot_anonymous_usage TO service_role;
ALTER TABLE public.tarot_anonymous_usage ENABLE ROW LEVEL SECURITY;
-- no policies: only service_role (edge function) ever touches it

-- 3) Per-user quota consumer
CREATE OR REPLACE FUNCTION public.consume_tarot_quota(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today_start TIMESTAMPTZ := date_trunc('day', (now() AT TIME ZONE 'utc')) AT TIME ZONE 'utc';
  _is_admin BOOLEAN := false;
  _subscribed BOOLEAN := false;
  _tier TEXT := 'seeker';
  _today_count INT := 0;
  _credits INT := 0;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  _is_admin := public.has_role(_user_id, 'admin'::app_role);
  SELECT COALESCE(subscribed, false), COALESCE(subscription_tier, 'seeker')
    INTO _subscribed, _tier
    FROM public.subscribers WHERE user_id = _user_id;

  -- Admins + paid subscribers cast unlimited tarot
  IF _is_admin OR (_subscribed AND _tier IN ('acolyte', 'oracle_pro')) THEN
    RETURN jsonb_build_object('allowed', true, 'mode', 'subscriber');
  END IF;

  SELECT COUNT(*)::INT INTO _today_count
    FROM public.divination_receipts
    WHERE user_id = _user_id
      AND issued_at >= _today_start;

  IF _today_count = 0 THEN
    RETURN jsonb_build_object('allowed', true, 'mode', 'free_daily');
  END IF;

  SELECT COALESCE(tarot_credits, 0) INTO _credits
    FROM public.profiles WHERE user_id = _user_id;

  IF _credits > 0 THEN
    UPDATE public.profiles
      SET tarot_credits = tarot_credits - 1, updated_at = now()
      WHERE user_id = _user_id;
    RETURN jsonb_build_object('allowed', true, 'mode', 'paid', 'credits_remaining', _credits - 1);
  END IF;

  RETURN jsonb_build_object(
    'allowed', false,
    'reason', 'DAILY_FREE_USED',
    'credits_remaining', 0,
    'today_count', _today_count
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_tarot_quota(uuid) TO authenticated, service_role;

-- 4) Anonymous IP-based consumer (service role only)
CREATE OR REPLACE FUNCTION public.consume_tarot_quota_anonymous(_ip text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _current INT := 0;
BEGIN
  IF _ip IS NULL OR length(trim(_ip)) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'NO_IP');
  END IF;

  INSERT INTO public.tarot_anonymous_usage(ip, usage_date, cast_count)
    VALUES (_ip, _today, 0)
    ON CONFLICT (ip, usage_date) DO NOTHING;

  SELECT cast_count INTO _current
    FROM public.tarot_anonymous_usage
    WHERE ip = _ip AND usage_date = _today
    FOR UPDATE;

  IF _current >= 1 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ANON_DAILY_LIMIT', 'requires_signin', true);
  END IF;

  UPDATE public.tarot_anonymous_usage
    SET cast_count = cast_count + 1, updated_at = now()
    WHERE ip = _ip AND usage_date = _today;

  RETURN jsonb_build_object('allowed', true, 'mode', 'free_daily_anon');
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_tarot_quota_anonymous(text) TO service_role;

-- 5) Grant tarot credits (used by stripe webhook on one-time payment)
CREATE OR REPLACE FUNCTION public.grant_tarot_credits(_user_id uuid, _amount int)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _new INT;
BEGIN
  IF _user_id IS NULL OR _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;
  UPDATE public.profiles
    SET tarot_credits = COALESCE(tarot_credits, 0) + _amount, updated_at = now()
    WHERE user_id = _user_id
    RETURNING tarot_credits INTO _new;
  RETURN COALESCE(_new, 0);
END;
$$;
GRANT EXECUTE ON FUNCTION public.grant_tarot_credits(uuid, int) TO service_role;