
-- Raise anonymous daily tarot quota from 1 to 3 to let new visitors actually
-- experience the product before hitting any signup wall.
CREATE OR REPLACE FUNCTION public.consume_tarot_quota_anonymous(_ip text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _current INT := 0;
  _limit INT := 3;
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
