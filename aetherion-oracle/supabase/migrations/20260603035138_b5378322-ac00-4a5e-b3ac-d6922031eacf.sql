
-- 1. Mining attestations: restrict user UPDATE to safe, pre-verification edits
DROP POLICY IF EXISTS "Users update own attestations" ON public.mining_attestations;
CREATE POLICY "Users update own attestations"
ON public.mining_attestations
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND verified_at IS NULL
  AND verifier_note IS NULL
  AND onchain_tx_hash IS NULL
);

-- 2. Referral codes: stop exposing the whole table publicly
DROP POLICY IF EXISTS "Anyone can look up codes for attribution" ON public.referral_codes;

CREATE OR REPLACE FUNCTION public.lookup_referral_code(_code text)
RETURNS TABLE(user_id uuid, share_pct numeric)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id, share_pct
  FROM public.referral_codes
  WHERE code = upper(_code)
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.lookup_referral_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_referral_code(text) TO anon, authenticated, service_role;

-- 3. Server-side monthly cap inside consume_query_quota
CREATE OR REPLACE FUNCTION public.consume_query_quota(_user_id uuid, _daily_limit integer DEFAULT 15)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _month_start DATE := date_trunc('month', (now() AT TIME ZONE 'utc'))::date;
  _current_day INT;
  _current_month INT;
  _is_admin BOOLEAN;
  _tier TEXT := 'seeker';
  _subscribed BOOLEAN := false;
  _monthly_limit INT := 450;
BEGIN
  _is_admin := public.has_role(_user_id, 'admin');

  SELECT COALESCE(subscribed, false), COALESCE(subscription_tier, 'seeker')
    INTO _subscribed, _tier
    FROM public.subscribers WHERE user_id = _user_id;

  _monthly_limit := CASE
    WHEN _is_admin THEN 1000000
    WHEN _tier = 'oracle_pro' THEN 10000
    WHEN _tier = 'acolyte'    THEN 1000
    ELSE 450
  END;

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
$function$;

-- 4. Storage RLS for the private 'aetherion' bucket — owner-scoped CRUD
DROP POLICY IF EXISTS "aetherion owners read"   ON storage.objects;
DROP POLICY IF EXISTS "aetherion owners insert" ON storage.objects;
DROP POLICY IF EXISTS "aetherion owners update" ON storage.objects;
DROP POLICY IF EXISTS "aetherion owners delete" ON storage.objects;

CREATE POLICY "aetherion owners read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'aetherion' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "aetherion owners insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'aetherion' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "aetherion owners update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'aetherion' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'aetherion' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "aetherion owners delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'aetherion' AND auth.uid()::text = (storage.foldername(name))[1]);
