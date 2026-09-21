-- 1. Bonus columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_oracle_responses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_dream_images   INTEGER NOT NULL DEFAULT 0;

-- 2. Helper RPC: read own bonus totals (used by edge functions)
CREATE OR REPLACE FUNCTION public.get_user_bonuses(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'bonus_oracle_responses', COALESCE(bonus_oracle_responses, 0),
    'bonus_dream_images',     COALESCE(bonus_dream_images, 0)
  )
  FROM public.profiles WHERE user_id = _user_id;
$$;

-- 3. Referral signup: grant bonus to BOTH parties on first attribution
CREATE OR REPLACE FUNCTION public.record_referral_signup(_referred_user_id uuid, _code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _referrer UUID; _share NUMERIC; _caller UUID := auth.uid();
  _inserted BOOLEAN := false;
  _oracle_grant INT := 100;
  _image_grant  INT := 3;
BEGIN
  IF _caller IS NULL THEN RETURN false; END IF;
  IF _code IS NULL OR _code = '' THEN RETURN false; END IF;
  SELECT user_id, share_pct INTO _referrer, _share
    FROM public.referral_codes WHERE code = upper(_code);
  IF _referrer IS NULL OR _referrer = _caller THEN RETURN false; END IF;

  INSERT INTO public.referral_attributions(referrer_user_id, referred_user_id, code, share_pct)
    VALUES (_referrer, _caller, upper(_code), _share)
    ON CONFLICT (referred_user_id) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;

  IF _inserted THEN
    -- Grant signup bonus to BOTH parties (first attribution only)
    UPDATE public.profiles
      SET bonus_oracle_responses = COALESCE(bonus_oracle_responses, 0) + _oracle_grant,
          bonus_dream_images     = COALESCE(bonus_dream_images, 0)     + _image_grant
      WHERE user_id IN (_referrer, _caller);
  END IF;

  RETURN true;
END;
$$;

-- 4. Tier state — include bonus in monthly_limit
CREATE OR REPLACE FUNCTION public.get_user_tier_state(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _subscribed BOOLEAN := false;
  _tier_name TEXT := 'seeker';
  _monthly_limit INT := 999;
  _daily_limit INT := 33;
  _bonus_oracle INT := 0;
  _bonus_images INT := 0;
  _period TEXT := to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM');
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _month_start DATE := date_trunc('month', (now() AT TIME ZONE 'utc'))::date;
  _usage INT := 0;
  _today_usage INT := 0;
  _wallet TEXT;
  _is_admin BOOLEAN := false;
  _payment_status TEXT := 'active';
  _latest_invoice_url TEXT;
  _pending_tier TEXT;
  _pending_eff TIMESTAMPTZ;
  _cancel_eop BOOLEAN := false;
BEGIN
  _is_admin := public.has_role(_user_id, 'admin');

  SELECT COALESCE(s.subscribed, false), COALESCE(s.subscription_tier, 'seeker'),
         COALESCE(s.payment_status, 'active'),
         COALESCE(s.latest_invoice_hosted_url, s.latest_invoice_url),
         s.pending_tier, s.pending_tier_effective_at,
         COALESCE(s.cancel_at_period_end, false)
    INTO _subscribed, _tier_name, _payment_status, _latest_invoice_url,
         _pending_tier, _pending_eff, _cancel_eop
  FROM public.subscribers s WHERE s.user_id = _user_id;

  SELECT COALESCE(bonus_oracle_responses, 0), COALESCE(bonus_dream_images, 0)
    INTO _bonus_oracle, _bonus_images
    FROM public.profiles WHERE user_id = _user_id;

  _subscribed := COALESCE(_subscribed, false);
  IF _is_admin THEN
    _tier_name := 'oracle_pro';
    _subscribed := true;
  ELSIF _tier_name IS NULL OR _tier_name = '' THEN
    _tier_name := CASE WHEN _subscribed THEN 'acolyte' ELSE 'seeker' END;
  END IF;

  _monthly_limit := CASE _tier_name
    WHEN 'oracle_pro' THEN 10000
    WHEN 'acolyte'    THEN 1000
    ELSE 999
  END;
  IF _is_admin THEN
    _monthly_limit := 1000000;
  ELSE
    _monthly_limit := _monthly_limit + COALESCE(_bonus_oracle, 0);
  END IF;

  SELECT COALESCE(SUM(query_count), 0)::INT INTO _usage
  FROM public.query_usage WHERE user_id = _user_id AND usage_date >= _month_start;

  SELECT COALESCE(query_count, 0)::INT INTO _today_usage
  FROM public.query_usage WHERE user_id = _user_id AND usage_date = _today;

  SELECT wallet_address INTO _wallet FROM public.profiles WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'tier', _tier_name,
    'subscribed', _subscribed,
    'is_admin', _is_admin,
    'monthly_usage', COALESCE(_usage, 0),
    'monthly_limit', _monthly_limit,
    'daily_usage', COALESCE(_today_usage, 0),
    'daily_limit', _daily_limit,
    'daily_remaining', CASE WHEN _is_admin THEN -1 ELSE GREATEST(0, _daily_limit - COALESCE(_today_usage, 0)) END,
    'period', _period,
    'wallet_address', _wallet,
    'payment_status', _payment_status,
    'latest_invoice_url', _latest_invoice_url,
    'pending_tier', _pending_tier,
    'pending_tier_effective_at', _pending_eff,
    'cancel_at_period_end', _cancel_eop,
    'bonus_oracle_responses', COALESCE(_bonus_oracle, 0),
    'bonus_dream_images',     COALESCE(_bonus_images, 0)
  );
END;
$$;

-- 5. Quota consumer — include bonus in monthly cap
CREATE OR REPLACE FUNCTION public.consume_query_quota(_user_id uuid, _daily_limit integer DEFAULT 33)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _month_start DATE := date_trunc('month', (now() AT TIME ZONE 'utc'))::date;
  _current_day INT;
  _current_month INT;
  _is_admin BOOLEAN;
  _tier TEXT := 'seeker';
  _subscribed BOOLEAN := false;
  _monthly_limit INT := 999;
  _bonus_oracle INT := 0;
BEGIN
  _is_admin := public.has_role(_user_id, 'admin');

  SELECT COALESCE(subscribed, false), COALESCE(subscription_tier, 'seeker')
    INTO _subscribed, _tier
    FROM public.subscribers WHERE user_id = _user_id;

  SELECT COALESCE(bonus_oracle_responses, 0) INTO _bonus_oracle
    FROM public.profiles WHERE user_id = _user_id;

  _monthly_limit := CASE
    WHEN _is_admin THEN 1000000
    WHEN _tier = 'oracle_pro' THEN 10000
    WHEN _tier = 'acolyte'    THEN 1000
    ELSE 999
  END;
  IF NOT _is_admin THEN
    _monthly_limit := _monthly_limit + COALESCE(_bonus_oracle, 0);
  END IF;

  INSERT INTO public.query_usage (user_id, usage_date, query_count)
    VALUES (_user_id, _today, 0)
    ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT COALESCE(SUM(query_count), 0)::INT INTO _current_month
    FROM public.query_usage WHERE user_id = _user_id AND usage_date >= _month_start;

  SELECT query_count INTO _current_day
    FROM public.query_usage WHERE user_id = _user_id AND usage_date = _today;

  IF NOT _is_admin AND _current_month >= _monthly_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'MONTHLY_LIMIT_EXCEEDED',
      'monthly_used', _current_month, 'monthly_limit', _monthly_limit,
      'subscribed', _subscribed, 'tier', _tier
    );
  END IF;

  IF NOT _is_admin AND NOT _subscribed AND _current_day >= _daily_limit THEN
    RETURN jsonb_build_object(
      'allowed', false, 'reason', 'DAILY_LIMIT_EXCEEDED',
      'subscribed', false, 'remaining', 0, 'limit', _daily_limit
    );
  END IF;

  UPDATE public.query_usage SET query_count = query_count + 1
    WHERE user_id = _user_id AND usage_date = _today;

  RETURN jsonb_build_object(
    'allowed', true,
    'admin', _is_admin,
    'subscribed', _subscribed,
    'tier', _tier,
    'monthly_used', _current_month + 1,
    'monthly_limit', _monthly_limit,
    'daily_used', _current_day + 1,
    'daily_limit', _daily_limit,
    'remaining', CASE WHEN _is_admin OR _subscribed THEN -1 ELSE _daily_limit - (_current_day + 1) END
  );
END;
$$;