
-- 1. TART ledger (off-chain, append-only)
CREATE TABLE public.tart_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,                -- 'reading_verified', 'claim_inscribed', 'admin_adjust'
  receipt_id UUID REFERENCES public.divination_receipts(id) ON DELETE SET NULL,
  claim_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tart_ledger_user ON public.tart_ledger(user_id, created_at DESC);
CREATE UNIQUE INDEX idx_tart_ledger_receipt_unique
  ON public.tart_ledger(receipt_id) WHERE receipt_id IS NOT NULL;

GRANT SELECT ON public.tart_ledger TO authenticated;
GRANT ALL ON public.tart_ledger TO service_role;
ALTER TABLE public.tart_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own TART ledger" ON public.tart_ledger
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all TART ledger" ON public.tart_ledger
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Claim requests (user asks for on-chain inscription of their TART balance)
CREATE TABLE public.tart_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  btc_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|inscribing|inscribed|failed|canceled
  inscription_id TEXT,
  tx_hash TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tart_claims_user ON public.tart_claims(user_id, created_at DESC);
CREATE INDEX idx_tart_claims_status ON public.tart_claims(status);

GRANT SELECT, INSERT ON public.tart_claims TO authenticated;
GRANT ALL ON public.tart_claims TO service_role;
ALTER TABLE public.tart_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own claims" ON public.tart_claims
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all claims" ON public.tart_claims
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_tart_claims_updated
  BEFORE UPDATE ON public.tart_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Balance helper
CREATE OR REPLACE FUNCTION public.tart_balance(_user_id UUID)
RETURNS INTEGER
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta), 0)::INTEGER FROM public.tart_ledger WHERE user_id = _user_id;
$$;

-- 4. Award helper (idempotent on receipt_id)
CREATE OR REPLACE FUNCTION public.award_tart_for_receipt(_user_id UUID, _receipt_id UUID, _amount INTEGER DEFAULT 1)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _bal INTEGER;
BEGIN
  IF _user_id IS NULL OR _receipt_id IS NULL OR _amount IS NULL OR _amount <= 0 THEN
    RETURN public.tart_balance(_user_id);
  END IF;
  INSERT INTO public.tart_ledger(user_id, delta, reason, receipt_id)
    VALUES (_user_id, _amount, 'reading_verified', _receipt_id)
    ON CONFLICT (receipt_id) WHERE receipt_id IS NOT NULL DO NOTHING;
  RETURN public.tart_balance(_user_id);
END;
$$;

-- 5. Request on-chain claim (records intent; admin/cron inscribes)
CREATE OR REPLACE FUNCTION public.request_tart_claim(_amount INTEGER, _btc_address TEXT)
RETURNS public.tart_claims
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _bal INTEGER;
  _row public.tart_claims;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF _btc_address IS NULL OR _btc_address !~ '^(bc1|tb1|[13]|m|n|2)[a-zA-HJ-NP-Z0-9]{8,87}$' THEN
    RAISE EXCEPTION 'Invalid BTC address';
  END IF;
  SELECT public.tart_balance(_uid) INTO _bal;
  IF _bal < _amount THEN RAISE EXCEPTION 'Insufficient TART balance: have %, need %', _bal, _amount; END IF;

  INSERT INTO public.tart_claims(user_id, amount, btc_address, status)
    VALUES (_uid, _amount, _btc_address, 'pending')
    RETURNING * INTO _row;

  -- Reserve the balance now via a debit; refund on cancel/fail handled by admin/cron
  INSERT INTO public.tart_ledger(user_id, delta, reason, claim_id, metadata)
    VALUES (_uid, -_amount, 'claim_reserved', _row.id, jsonb_build_object('btc_address', _btc_address));

  RETURN _row;
END;
$$;

-- 6. Patch verify_divination_receipt to award TART
CREATE OR REPLACE FUNCTION public.verify_divination_receipt(_nonce text, _commitment_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _row public.divination_receipts;
  _uid UUID := auth.uid();
  _tart_balance INTEGER := 0;
  _awarded BOOLEAN := false;
BEGIN
  IF _nonce IS NULL OR _commitment_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'MISSING_PARAMS');
  END IF;

  SELECT * INTO _row FROM public.divination_receipts WHERE nonce = _nonce FOR UPDATE;
  IF _row IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND'); END IF;
  IF _row.commitment_hash <> _commitment_hash THEN RETURN jsonb_build_object('ok', false, 'reason', 'HASH_MISMATCH'); END IF;
  IF _row.expires_at < now() THEN RETURN jsonb_build_object('ok', false, 'reason', 'EXPIRED'); END IF;
  IF _row.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_VERIFIED', 'verified_at', _row.verified_at);
  END IF;

  UPDATE public.divination_receipts
    SET verified_at = now(), verified_by = _uid
    WHERE id = _row.id;

  -- Award +1 TART to the receipt owner (idempotent on receipt_id)
  IF _row.user_id IS NOT NULL THEN
    INSERT INTO public.tart_ledger(user_id, delta, reason, receipt_id)
      VALUES (_row.user_id, 1, 'reading_verified', _row.id)
      ON CONFLICT (receipt_id) WHERE receipt_id IS NOT NULL DO NOTHING;
    _awarded := FOUND;
    SELECT public.tart_balance(_row.user_id) INTO _tart_balance;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'nonce', _row.nonce,
    'commitment_hash', _row.commitment_hash,
    'wallet_address', _row.wallet_address,
    'issued_at', _row.issued_at,
    'verified_at', now(),
    'cards', _row.cards,
    'quantum', _row.quantum,
    'tart_awarded', _awarded,
    'tart_balance', _tart_balance
  );
END;
$function$;
