
CREATE OR REPLACE FUNCTION public.consume_tarot_quota_anonymous(_ip text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _current INT := 0;
  _limit INT := 10;
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

  IF _current >= _limit THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ANON_DAILY_LIMIT', 'requires_signin', true, 'remaining', 0, 'limit', _limit);
  END IF;

  UPDATE public.tarot_anonymous_usage
    SET cast_count = cast_count + 1, updated_at = now()
    WHERE ip = _ip AND usage_date = _today;

  RETURN jsonb_build_object('allowed', true, 'mode', 'free_daily_anon', 'remaining', _limit - (_current + 1), 'limit', _limit);
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_tarot_quota(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today_start TIMESTAMPTZ := date_trunc('day', (now() AT TIME ZONE 'utc')) AT TIME ZONE 'utc';
  _is_admin BOOLEAN := false;
  _subscribed BOOLEAN := false;
  _tier TEXT := 'seeker';
  _today_count INT := 0;
  _credits INT := 0;
  _free_daily INT := 5;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  _is_admin := public.has_role(_user_id, 'admin'::app_role);
  SELECT COALESCE(subscribed, false), COALESCE(subscription_tier, 'seeker')
    INTO _subscribed, _tier
    FROM public.subscribers WHERE user_id = _user_id;

  IF _is_admin OR (_subscribed AND _tier IN ('acolyte', 'oracle_pro')) THEN
    RETURN jsonb_build_object('allowed', true, 'mode', 'subscriber');
  END IF;

  SELECT COUNT(*)::INT INTO _today_count
    FROM public.divination_receipts
    WHERE user_id = _user_id
      AND issued_at >= _today_start;

  IF _today_count < _free_daily THEN
    RETURN jsonb_build_object('allowed', true, 'mode', 'free_daily', 'remaining', _free_daily - (_today_count + 1), 'limit', _free_daily);
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
    'today_count', _today_count,
    'limit', _free_daily
  );
END;
$function$;
