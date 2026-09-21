
-- ============== promo_codes table ==============
CREATE TABLE public.promo_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  tier            TEXT NOT NULL CHECK (tier IN ('acolyte','oracle_pro')),
  duration_days   INTEGER NOT NULL DEFAULT 30 CHECK (duration_days > 0 AND duration_days <= 3650),
  max_uses        INTEGER,
  uses_count      INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT true,
  note            TEXT,
  created_by      UUID NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_promo_codes_code ON public.promo_codes (code);
CREATE INDEX idx_promo_codes_active ON public.promo_codes (active) WHERE active = true;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all promo codes"
  ON public.promo_codes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Mutations only via SECURITY DEFINER RPCs below; no direct INSERT/UPDATE/DELETE policies.

CREATE TRIGGER trg_promo_codes_updated
  BEFORE UPDATE ON public.promo_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============== promo_redemptions table ==============
CREATE TABLE public.promo_redemptions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id   UUID NOT NULL REFERENCES public.promo_codes(id) ON DELETE CASCADE,
  code            TEXT NOT NULL,
  user_id         UUID NOT NULL,
  tier_granted    TEXT NOT NULL,
  duration_days   INTEGER NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  redeemed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (promo_code_id, user_id)
);

CREATE INDEX idx_promo_redemptions_user ON public.promo_redemptions (user_id);
CREATE INDEX idx_promo_redemptions_code ON public.promo_redemptions (promo_code_id);

GRANT SELECT ON public.promo_redemptions TO authenticated;
GRANT ALL ON public.promo_redemptions TO service_role;

ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redemptions"
  ON public.promo_redemptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read all redemptions"
  ON public.promo_redemptions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ============== admin_create_promo_codes ==============
CREATE OR REPLACE FUNCTION public.admin_create_promo_codes(
  _count INTEGER,
  _tier TEXT,
  _duration_days INTEGER DEFAULT 30,
  _max_uses INTEGER DEFAULT 1,
  _expires_at TIMESTAMPTZ DEFAULT NULL,
  _note TEXT DEFAULT NULL,
  _prefix TEXT DEFAULT 'AETHER'
) RETURNS TABLE (id UUID, code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _i INTEGER;
  _code TEXT;
  _new_id UUID;
  _safe_prefix TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  IF _count IS NULL OR _count < 1 OR _count > 500 THEN RAISE EXCEPTION 'count must be 1..500'; END IF;
  IF _tier NOT IN ('acolyte','oracle_pro') THEN RAISE EXCEPTION 'invalid tier'; END IF;

  _safe_prefix := upper(regexp_replace(COALESCE(NULLIF(_prefix,''), 'AETHER'), '[^A-Z0-9]', '', 'g'));
  IF length(_safe_prefix) > 12 THEN _safe_prefix := substr(_safe_prefix, 1, 12); END IF;
  IF length(_safe_prefix) < 2 THEN _safe_prefix := 'AETHER'; END IF;

  FOR _i IN 1.._count LOOP
    LOOP
      _code := _safe_prefix || '-' ||
               upper(substr(replace(replace(replace(encode(gen_random_bytes(6),'base64'),'/','X'),'+','Y'),'=',''), 1, 8));
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.promo_codes WHERE code = _code);
    END LOOP;

    INSERT INTO public.promo_codes (code, tier, duration_days, max_uses, expires_at, note, created_by)
    VALUES (_code, _tier, _duration_days, NULLIF(_max_uses, 0), _expires_at, _note, _uid)
    RETURNING promo_codes.id INTO _new_id;

    id := _new_id;
    code := _code;
    RETURN NEXT;
  END LOOP;
END;
$$;

-- ============== admin_set_promo_active ==============
CREATE OR REPLACE FUNCTION public.admin_set_promo_active(_id UUID, _active BOOLEAN)
RETURNS public.promo_codes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.promo_codes;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(_uid, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;
  UPDATE public.promo_codes SET active = _active WHERE id = _id RETURNING * INTO _row;
  IF _row IS NULL THEN RAISE EXCEPTION 'Code not found'; END IF;
  RETURN _row;
END;
$$;

-- ============== redeem_promo_code ==============
CREATE OR REPLACE FUNCTION public.redeem_promo_code(_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _email TEXT;
  _pc public.promo_codes;
  _new_period_end TIMESTAMPTZ;
  _current_end TIMESTAMPTZ;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _code IS NULL OR length(trim(_code)) < 4 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INVALID_CODE');
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;

  SELECT * INTO _pc FROM public.promo_codes
    WHERE code = upper(trim(_code)) FOR UPDATE;

  IF _pc IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;
  IF NOT _pc.active THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INACTIVE');
  END IF;
  IF _pc.expires_at IS NOT NULL AND _pc.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'EXPIRED');
  END IF;
  IF _pc.max_uses IS NOT NULL AND _pc.uses_count >= _pc.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'EXHAUSTED');
  END IF;
  IF EXISTS (SELECT 1 FROM public.promo_redemptions WHERE promo_code_id = _pc.id AND user_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_REDEEMED');
  END IF;

  -- Extend from current subscription end if still active, else from now
  SELECT subscription_end INTO _current_end FROM public.subscribers WHERE user_id = _uid;
  _new_period_end := GREATEST(COALESCE(_current_end, now()), now()) + (_pc.duration_days || ' days')::INTERVAL;

  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
  VALUES (_uid, COALESCE(_email, ''), true, _pc.tier, _new_period_end)
  ON CONFLICT (user_id) DO UPDATE
    SET subscribed = true,
        subscription_tier = EXCLUDED.subscription_tier,
        subscription_end = EXCLUDED.subscription_end,
        email = COALESCE(public.subscribers.email, EXCLUDED.email),
        payment_status = 'active',
        updated_at = now();

  INSERT INTO public.promo_redemptions (promo_code_id, code, user_id, tier_granted, duration_days, period_end)
  VALUES (_pc.id, _pc.code, _uid, _pc.tier, _pc.duration_days, _new_period_end);

  UPDATE public.promo_codes SET uses_count = uses_count + 1 WHERE id = _pc.id;

  INSERT INTO public.tier_change_audit (user_id, email, from_tier, to_tier, change_type, source, metadata)
  VALUES (_uid, _email, NULL, _pc.tier, 'admin_grant', 'promo_code',
          jsonb_build_object('promo_code', _pc.code, 'duration_days', _pc.duration_days));

  RETURN jsonb_build_object(
    'ok', true,
    'tier', _pc.tier,
    'duration_days', _pc.duration_days,
    'period_end', _new_period_end
  );
END;
$$;

-- subscribers needs a unique constraint on user_id for ON CONFLICT to work; verify it exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.subscribers'::regclass
      AND contype IN ('p','u')
      AND conkey = (SELECT array_agg(attnum) FROM pg_attribute WHERE attrelid='public.subscribers'::regclass AND attname='user_id')
  ) THEN
    ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_user_id_unique UNIQUE (user_id);
  END IF;
END $$;
