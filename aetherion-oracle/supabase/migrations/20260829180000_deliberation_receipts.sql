-- B2B Proof-of-Deliberation receipts — audit-grade human attention before AI approval.

CREATE TABLE public.deliberation_receipts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization TEXT NOT NULL,
  reviewer_id TEXT NOT NULL,
  artifact_hash TEXT NOT NULL,
  artifact_excerpt TEXT,
  dwell_ms INTEGER NOT NULL CHECK (dwell_ms >= 0),
  min_dwell_ms INTEGER NOT NULL CHECK (min_dwell_ms >= 0),
  scroll_depth_pct INTEGER NOT NULL CHECK (scroll_depth_pct >= 0 AND scroll_depth_pct <= 100),
  acknowledged_clauses JSONB NOT NULL DEFAULT '[]'::jsonb,
  nonce TEXT NOT NULL,
  commitment_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 years'),
  CONSTRAINT deliberation_receipts_nonce_key UNIQUE (nonce),
  CONSTRAINT deliberation_receipts_hash_key UNIQUE (commitment_hash)
);

CREATE INDEX deliberation_receipts_org_idx ON public.deliberation_receipts (organization, issued_at DESC);
CREATE INDEX deliberation_receipts_reviewer_idx ON public.deliberation_receipts (reviewer_id, issued_at DESC);

GRANT SELECT ON public.deliberation_receipts TO authenticated;
GRANT ALL ON public.deliberation_receipts TO service_role;

ALTER TABLE public.deliberation_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users view own deliberation receipts"
  ON public.deliberation_receipts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all deliberation receipts"
  ON public.deliberation_receipts
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.verify_deliberation_receipt(_nonce TEXT, _commitment_hash TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row public.deliberation_receipts;
  _uid UUID := auth.uid();
BEGIN
  IF _nonce IS NULL OR _commitment_hash IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'MISSING_PARAMS');
  END IF;

  SELECT * INTO _row
    FROM public.deliberation_receipts
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

  UPDATE public.deliberation_receipts
    SET verified_at = now(), verified_by = _uid
    WHERE id = _row.id;

  RETURN jsonb_build_object(
    'ok', true,
    'nonce', _row.nonce,
    'commitment_hash', _row.commitment_hash,
    'organization', _row.organization,
    'reviewer_id', _row.reviewer_id,
    'artifact_hash', _row.artifact_hash,
    'dwell_ms', _row.dwell_ms,
    'min_dwell_ms', _row.min_dwell_ms,
    'scroll_depth_pct', _row.scroll_depth_pct,
    'acknowledged_clauses', _row.acknowledged_clauses,
    'issued_at', _row.issued_at,
    'verified_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_deliberation_receipt(TEXT, TEXT) TO authenticated, anon;
