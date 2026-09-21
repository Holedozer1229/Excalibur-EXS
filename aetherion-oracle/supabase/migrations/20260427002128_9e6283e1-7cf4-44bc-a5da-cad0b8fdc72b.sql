-- 1. Add wallet_address to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_address TEXT;

-- Optional: basic shape check (0x + 40 hex). Validation only, not uniqueness.
CREATE OR REPLACE FUNCTION public.validate_wallet_address()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.wallet_address IS NOT NULL
     AND NEW.wallet_address !~ '^0x[a-fA-F0-9]{40}$' THEN
    RAISE EXCEPTION 'Invalid EVM wallet address: %', NEW.wallet_address;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_validate_wallet ON public.profiles;
CREATE TRIGGER profiles_validate_wallet
BEFORE INSERT OR UPDATE OF wallet_address ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_wallet_address();

-- 2. RPC: tier + monthly usage in one call
CREATE OR REPLACE FUNCTION public.get_user_tier_state(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _subscribed BOOLEAN := false;
  _tier_name TEXT := 'seeker';
  _monthly_limit INT := 20;
  _period TEXT := to_char((now() AT TIME ZONE 'utc'), 'YYYY-MM');
  _month_start DATE := date_trunc('month', (now() AT TIME ZONE 'utc'))::date;
  _usage INT := 0;
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
    ELSE 20
  END;

  SELECT COALESCE(SUM(query_count), 0)::INT INTO _usage
  FROM public.query_usage
  WHERE user_id = _user_id
    AND usage_date >= _month_start;

  SELECT wallet_address INTO _wallet
  FROM public.profiles WHERE user_id = _user_id;

  RETURN jsonb_build_object(
    'tier', _tier_name,
    'subscribed', _subscribed,
    'monthly_usage', _usage,
    'monthly_limit', _monthly_limit,
    'period', _period,
    'wallet_address', _wallet
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_user_tier_state(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_tier_state(UUID) TO authenticated;