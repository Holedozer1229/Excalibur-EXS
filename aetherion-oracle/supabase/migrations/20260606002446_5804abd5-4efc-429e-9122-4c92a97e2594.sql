CREATE TABLE public.divination_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  wallet_address TEXT,
  nonce TEXT NOT NULL,
  commitment_hash TEXT NOT NULL,
  question_excerpt TEXT,
  cards JSONB,
  quantum JSONB,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '90 days'),
  CONSTRAINT divination_receipts_nonce_key UNIQUE (nonce),
  CONSTRAINT divination_receipts_hash_key UNIQUE (commitment_hash)
);

CREATE INDEX divination_receipts_user_idx ON public.divination_receipts (user_id, issued_at DESC);
CREATE INDEX divination_receipts_wallet_idx ON public.divination_receipts (wallet_address);

GRANT SELECT ON public.divination_receipts TO authenticated;
GRANT ALL ON public.divination_receipts TO service_role;

ALTER TABLE public.divination_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seekers can view their own receipts"
  ON public.divination_receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all receipts"
  ON public.divination_receipts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- One-shot verifier: marks a receipt verified iff not already verified
-- and not expired. Returns the receipt row or NULL. SECURITY DEFINER so
-- the verifying user does not need write privileges on the table.
CREATE OR REPLACE FUNCTION public.verify_divination_receipt(_nonce TEXT, _commitment_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.divination_receipts;
  _uid UUID := auth.uid();
BEGIN
  IF _nonce IS NULL OR _commitment_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'MISSING_PARAMS');
  END IF;

  SELECT * INTO _row
    FROM public.divination_receipts
    WHERE nonce = _nonce
    FOR UPDATE;

  IF _row IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'NOT_FOUND');
  END IF;
  IF _row.commitment_hash <> _commitment_hash THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'HASH_MISMATCH');
  END IF;
  IF _row.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'EXPIRED');
  END IF;
  IF _row.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'reason', 'ALREADY_VERIFIED',
      'verified_at', _row.verified_at
    );
  END IF;

  UPDATE public.divination_receipts
    SET verified_at = now(), verified_by = _uid
    WHERE id = _row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'nonce', _row.nonce,
    'commitment_hash', _row.commitment_hash,
    'wallet_address', _row.wallet_address,
    'issued_at', _row.issued_at,
    'verified_at', now(),
    'cards', _row.cards,
    'quantum', _row.quantum
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_divination_receipt(TEXT, TEXT) TO authenticated, anon;