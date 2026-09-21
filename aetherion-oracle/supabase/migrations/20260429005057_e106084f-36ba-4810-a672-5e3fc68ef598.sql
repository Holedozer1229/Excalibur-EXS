CREATE OR REPLACE FUNCTION public.get_user_tier_state(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _subscribed BOOLEAN := false;
  _tier_name TEXT := 'seeker';
  _monthly_limit INT := 450; -- 15/day * ~30
  _daily_limit INT := 15;
  _period TEXT := to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM');
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _month_start DATE := date_trunc('month', (now() AT TIME ZONE 'utc'))::date;
  _usage INT := 0;
  _today_usage INT := 0;
  _wallet TEXT;
BEGIN
  SELECT COALESCE(s.subscribed, false), COALESCE(s.subscription_tier, 'seeker')
    INTO _subscribed, _tier_name
  FROM public.subscribers s
  WHERE s.user_id = _user_id;

  IF _tier_name IS NULL OR _tier_name = '' THEN
    _tier_name := CASE WHEN _subscribed THEN 'acolyte' ELSE 'seeker' END;
  END IF;

  _monthly_limit := CASE _tier_name
    WHEN 'oracle_pro' THEN 10000
    WHEN 'acolyte'    THEN 1000
    ELSE 450
  END;

  SELECT COALESCE(SUM(query_count), 0)::INT INTO _usage
  FROM public.query_usage
  WHERE user_id = _user_id
    AND usage_date >= _month_start;

  SELECT COALESCE(query_count, 0)::INT INTO _today_usage
  FROM public.query_usage
  WHERE user_id = _user_id AND usage_date = _today;

  SELECT wallet_address INTO _wallet
  FROM public.profiles WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'tier', _tier_name,
    'subscribed', _subscribed,
    'monthly_usage', _usage,
    'monthly_limit', _monthly_limit,
    'daily_usage', _today_usage,
    'daily_limit', _daily_limit,
    'daily_remaining', GREATEST(0, _daily_limit - _today_usage),
    'period', _period,
    'wallet_address', _wallet
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_user_tier_state(uuid) FROM anon, public, authenticated;