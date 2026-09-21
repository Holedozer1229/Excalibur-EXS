
-- 1. Roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

DROP POLICY IF EXISTS "Users view their own roles" ON public.user_roles;
CREATE POLICY "Users view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all roles" ON public.user_roles;
CREATE POLICY "Admins view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 2. Grant admin to unicornsuperintelligence@gmail.com + permanent Oracle Pro
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users
WHERE email = 'unicornsuperintelligence@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
SELECT id, email, true, 'oracle_pro', (now() + interval '100 years')
FROM auth.users WHERE email = 'unicornsuperintelligence@gmail.com'
ON CONFLICT (user_id) DO UPDATE
  SET subscribed = true,
      subscription_tier = 'oracle_pro',
      subscription_end = (now() + interval '100 years'),
      updated_at = now();

-- 3. Subscribers: payment lifecycle columns
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_payment_failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS latest_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS latest_invoice_hosted_url TEXT,
  ADD COLUMN IF NOT EXISTS pending_tier TEXT,
  ADD COLUMN IF NOT EXISTS pending_tier_effective_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- 4. Stripe invoices ledger
CREATE TABLE IF NOT EXISTS public.stripe_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  amount_paid INTEGER NOT NULL DEFAULT 0,
  amount_due INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  tier TEXT,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  receipt_url TEXT,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view their own invoices" ON public.stripe_invoices;
CREATE POLICY "Users view their own invoices" ON public.stripe_invoices
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all invoices" ON public.stripe_invoices;
CREATE POLICY "Admins view all invoices" ON public.stripe_invoices
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_stripe_invoices_user ON public.stripe_invoices (user_id, created_at DESC);

-- 5. Updated tier state (admin-aware + payment lifecycle)
CREATE OR REPLACE FUNCTION public.get_user_tier_state(_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _subscribed BOOLEAN := false;
  _tier_name TEXT := 'seeker';
  _monthly_limit INT := 450;
  _daily_limit INT := 15;
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
    ELSE 450
  END;
  IF _is_admin THEN _monthly_limit := 1000000; END IF;

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
    'cancel_at_period_end', _cancel_eop
  );
END;
$function$;

-- 6. Updated quota: admins bypass
CREATE OR REPLACE FUNCTION public.consume_query_quota(_user_id uuid, _daily_limit integer DEFAULT 15)
 RETURNS jsonb
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _current INTEGER;
  _is_subscribed BOOLEAN;
  _is_admin BOOLEAN;
BEGIN
  _is_admin := public.has_role(_user_id, 'admin');
  IF _is_admin THEN
    INSERT INTO public.query_usage (user_id, usage_date, query_count)
      VALUES (_user_id, _today, 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET query_count = public.query_usage.query_count + 1;
    RETURN jsonb_build_object('allowed', true, 'subscribed', true, 'admin', true, 'remaining', -1);
  END IF;

  SELECT COALESCE(subscribed, false) INTO _is_subscribed
    FROM public.subscribers WHERE user_id = _user_id;

  IF COALESCE(_is_subscribed, false) THEN
    INSERT INTO public.query_usage (user_id, usage_date, query_count)
      VALUES (_user_id, _today, 1)
      ON CONFLICT (user_id, usage_date)
      DO UPDATE SET query_count = public.query_usage.query_count + 1;
    RETURN jsonb_build_object('allowed', true, 'subscribed', true, 'remaining', -1);
  END IF;

  INSERT INTO public.query_usage (user_id, usage_date, query_count)
    VALUES (_user_id, _today, 0)
    ON CONFLICT (user_id, usage_date) DO NOTHING;

  SELECT query_count INTO _current
    FROM public.query_usage WHERE user_id = _user_id AND usage_date = _today;

  IF _current >= _daily_limit THEN
    RETURN jsonb_build_object('allowed', false, 'subscribed', false, 'remaining', 0, 'limit', _daily_limit);
  END IF;

  UPDATE public.query_usage SET query_count = query_count + 1
    WHERE user_id = _user_id AND usage_date = _today;

  RETURN jsonb_build_object('allowed', true, 'subscribed', false, 'remaining', _daily_limit - (_current + 1), 'limit', _daily_limit);
END;
$function$;
