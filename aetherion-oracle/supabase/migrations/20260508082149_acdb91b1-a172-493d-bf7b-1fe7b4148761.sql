
-- 1. Stripe webhook idempotency
CREATE TABLE public.processed_stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.processed_stripe_events ENABLE ROW LEVEL SECURITY;
-- no public policies; service role only

-- 2. Referrals
CREATE TABLE public.referral_codes (
  user_id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  share_pct NUMERIC NOT NULL DEFAULT 20.00 CHECK (share_pct >= 0 AND share_pct <= 50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own referral code" ON public.referral_codes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can look up codes for attribution" ON public.referral_codes
  FOR SELECT USING (true);
CREATE POLICY "Admins manage referral codes" ON public.referral_codes
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  code TEXT NOT NULL,
  share_pct NUMERIC NOT NULL,
  total_credited_cents INTEGER NOT NULL DEFAULT 0,
  first_invoice_at TIMESTAMPTZ,
  last_invoice_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrer sees their attributions" ON public.referral_attributions
  FOR SELECT USING (auth.uid() = referrer_user_id);
CREATE POLICY "Admins view all attributions" ON public.referral_attributions
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Credits ledger
CREATE TABLE public.credits_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  command TEXT,
  ref TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_credits_ledger_user_created ON public.credits_ledger(user_id, created_at DESC);
ALTER TABLE public.credits_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ledger" ON public.credits_ledger
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all ledger" ON public.credits_ledger
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Terminal audit
CREATE TABLE public.terminal_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  command TEXT NOT NULL,
  args JSONB NOT NULL DEFAULT '{}'::jsonb,
  tier TEXT,
  credit_cost INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_terminal_audit_user ON public.terminal_audit(user_id, created_at DESC);
ALTER TABLE public.terminal_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own terminal audit" ON public.terminal_audit
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all terminal audit" ON public.terminal_audit
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. Subscribers: referral code used at checkout
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- 6. RPCs
CREATE OR REPLACE FUNCTION public.credits_balance(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta), 0)::INTEGER FROM public.credits_ledger WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION public.spend_credits(
  _user_id UUID, _amount INTEGER, _reason TEXT,
  _command TEXT DEFAULT NULL, _ref TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _bal INTEGER;
  _is_admin BOOLEAN;
BEGIN
  IF _amount <= 0 THEN
    RAISE EXCEPTION 'amount must be positive';
  END IF;
  _is_admin := public.has_role(_user_id, 'admin');
  IF _is_admin THEN
    RETURN jsonb_build_object('ok', true, 'admin', true, 'balance', -1, 'spent', 0);
  END IF;
  SELECT public.credits_balance(_user_id) INTO _bal;
  IF _bal < _amount THEN
    RETURN jsonb_build_object('ok', false, 'balance', _bal, 'needed', _amount);
  END IF;
  INSERT INTO public.credits_ledger(user_id, delta, reason, command, ref)
    VALUES (_user_id, -_amount, _reason, _command, _ref);
  RETURN jsonb_build_object('ok', true, 'balance', _bal - _amount, 'spent', _amount);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_referral_code(_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _code TEXT;
BEGIN
  SELECT code INTO _code FROM public.referral_codes WHERE user_id = _user_id;
  IF _code IS NOT NULL THEN RETURN _code; END IF;
  -- 8-char base32-ish code
  _code := upper(substr(replace(encode(gen_random_bytes(6), 'base64'), '/', '0'), 1, 8));
  _code := replace(replace(_code, '+', 'A'), '=', 'B');
  INSERT INTO public.referral_codes(user_id, code) VALUES (_user_id, _code)
    ON CONFLICT (user_id) DO UPDATE SET code = referral_codes.code
    RETURNING code INTO _code;
  RETURN _code;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_referral_signup(
  _referred_user_id UUID, _code TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _referrer UUID; _share NUMERIC;
BEGIN
  IF _code IS NULL OR _code = '' THEN RETURN false; END IF;
  SELECT user_id, share_pct INTO _referrer, _share
    FROM public.referral_codes WHERE code = upper(_code);
  IF _referrer IS NULL OR _referrer = _referred_user_id THEN RETURN false; END IF;
  INSERT INTO public.referral_attributions(referrer_user_id, referred_user_id, code, share_pct)
    VALUES (_referrer, _referred_user_id, upper(_code), _share)
    ON CONFLICT (referred_user_id) DO NOTHING;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_referral_invoice(
  _referred_user_id UUID, _amount_paid_cents INTEGER, _invoice_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _att RECORD;
  _commission INTEGER;
BEGIN
  SELECT * INTO _att FROM public.referral_attributions
    WHERE referred_user_id = _referred_user_id;
  IF _att IS NULL THEN RETURN jsonb_build_object('credited', false); END IF;

  _commission := FLOOR(_amount_paid_cents * (_att.share_pct / 100.0))::INTEGER;
  IF _commission <= 0 THEN RETURN jsonb_build_object('credited', false); END IF;

  -- Award referral commission as credits (1 credit = 1 cent)
  INSERT INTO public.credits_ledger(user_id, delta, reason, command, ref, metadata)
    VALUES (_att.referrer_user_id, _commission, 'referral_commission', NULL, _invoice_id,
            jsonb_build_object('referred_user_id', _referred_user_id, 'invoice', _invoice_id));

  UPDATE public.referral_attributions
    SET total_credited_cents = total_credited_cents + _commission,
        last_invoice_at = now(),
        first_invoice_at = COALESCE(first_invoice_at, now())
    WHERE id = _att.id;

  RETURN jsonb_build_object('credited', true, 'amount', _commission, 'referrer', _att.referrer_user_id);
END;
$$;
