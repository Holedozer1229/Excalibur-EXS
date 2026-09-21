
-- AETX ledger
CREATE TABLE public.aetx_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  receipt_id UUID NULL,
  claim_id UUID NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX aetx_ledger_receipt_unique ON public.aetx_ledger(receipt_id) WHERE receipt_id IS NOT NULL;
CREATE INDEX aetx_ledger_user_idx ON public.aetx_ledger(user_id, created_at DESC);

GRANT SELECT ON public.aetx_ledger TO authenticated;
GRANT ALL ON public.aetx_ledger TO service_role;
ALTER TABLE public.aetx_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own aetx ledger" ON public.aetx_ledger FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- AETX claims
CREATE TABLE public.aetx_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount > 0),
  btc_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tx_hash TEXT NULL,
  inscription_id TEXT NULL,
  note TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX aetx_claims_user_idx ON public.aetx_claims(user_id, created_at DESC);
CREATE INDEX aetx_claims_status_idx ON public.aetx_claims(status);

GRANT SELECT ON public.aetx_claims TO authenticated;
GRANT ALL ON public.aetx_claims TO service_role;
ALTER TABLE public.aetx_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own aetx claims" ON public.aetx_claims FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER aetx_claims_updated_at BEFORE UPDATE ON public.aetx_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER aetx_claims_validate_btc BEFORE INSERT OR UPDATE ON public.aetx_claims FOR EACH ROW EXECUTE FUNCTION public.validate_wallet_address();

-- Balance helper
CREATE OR REPLACE FUNCTION public.aetx_balance(_user_id UUID)
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(SUM(delta), 0)::INTEGER FROM public.aetx_ledger WHERE user_id = _user_id;
$$;

-- Grant AETX (admin / service role usage via SECURITY DEFINER, but also callable by signed-in users in idempotent contexts)
CREATE OR REPLACE FUNCTION public.grant_aetx(_user_id UUID, _amount INTEGER, _reason TEXT, _ref TEXT DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _caller UUID := auth.uid();
BEGIN
  IF _user_id IS NULL OR _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'invalid arguments';
  END IF;
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;
  INSERT INTO public.aetx_ledger(user_id, delta, reason, metadata)
    VALUES (_user_id, _amount, _reason, jsonb_build_object('ref', _ref, 'granted_by', _caller));
  RETURN public.aetx_balance(_user_id);
END;
$$;

-- Burn AETX for premium seal (idempotent on receipt_id)
CREATE OR REPLACE FUNCTION public.burn_aetx_for_seal(_receipt_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _owner UUID;
  _bal INTEGER;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _receipt_id IS NULL THEN RAISE EXCEPTION 'receipt_id required'; END IF;
  SELECT user_id INTO _owner FROM public.divination_receipts WHERE id = _receipt_id;
  IF _owner IS NULL OR _owner <> _uid THEN RAISE EXCEPTION 'Not your receipt'; END IF;
  SELECT public.aetx_balance(_uid) INTO _bal;
  IF _bal < 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'INSUFFICIENT_AETX', 'balance', _bal);
  END IF;
  BEGIN
    INSERT INTO public.aetx_ledger(user_id, delta, reason, receipt_id)
      VALUES (_uid, -1, 'premium_seal', _receipt_id);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'ALREADY_SEALED', 'balance', _bal);
  END;
  RETURN jsonb_build_object('ok', true, 'balance', _bal - 1);
END;
$$;

-- Request AETX claim
CREATE OR REPLACE FUNCTION public.request_aetx_claim(_amount INTEGER, _btc_address TEXT)
RETURNS public.aetx_claims LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid UUID := auth.uid();
  _bal INTEGER;
  _row public.aetx_claims;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF _btc_address IS NULL OR _btc_address !~ '^(bc1|tb1|[13]|m|n|2)[a-zA-HJ-NP-Z0-9]{8,87}$' THEN
    RAISE EXCEPTION 'Invalid BTC address';
  END IF;
  SELECT public.aetx_balance(_uid) INTO _bal;
  IF _bal < _amount THEN RAISE EXCEPTION 'Insufficient AETX balance: have %, need %', _bal, _amount; END IF;

  INSERT INTO public.aetx_claims(user_id, amount, btc_address, status)
    VALUES (_uid, _amount, _btc_address, 'pending')
    RETURNING * INTO _row;

  INSERT INTO public.aetx_ledger(user_id, delta, reason, claim_id, metadata)
    VALUES (_uid, -_amount, 'claim_reserved', _row.id, jsonb_build_object('btc_address', _btc_address));

  RETURN _row;
END;
$$;
