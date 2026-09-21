
CREATE TABLE public.mining_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  merkle_root TEXT NOT NULL,
  attestation_count INTEGER NOT NULL DEFAULT 0,
  attestation_ids UUID[] NOT NULL DEFAULT '{}',
  chain_id INTEGER,
  onchain_tx_hash TEXT,
  contract_address TEXT,
  anchored_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mining_anchors TO anon, authenticated;
GRANT ALL ON public.mining_anchors TO service_role;

ALTER TABLE public.mining_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anchors are public read"
  ON public.mining_anchors FOR SELECT
  USING (true);

CREATE POLICY "Admins manage anchors"
  ON public.mining_anchors FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER mining_anchors_updated_at
  BEFORE UPDATE ON public.mining_anchors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mining_anchors_period ON public.mining_anchors (period_end DESC);

-- Public, redacted view of verified attestations for the shared ledger.
CREATE OR REPLACE FUNCTION public.get_public_ledger(_limit INTEGER DEFAULT 100)
RETURNS TABLE (
  id UUID,
  round_number INTEGER,
  word TEXT,
  harmony NUMERIC,
  sponge_harmonic NUMERIC,
  vitality TEXT,
  attestation_hash TEXT,
  wallet_address TEXT,
  status TEXT,
  onchain_tx_hash TEXT,
  verified_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, round_number, word, harmony, sponge_harmonic, vitality,
         attestation_hash, wallet_address, status::TEXT, onchain_tx_hash,
         verified_at, submitted_at
  FROM public.mining_attestations
  WHERE status IN ('verified', 'minted')
  ORDER BY COALESCE(verified_at, submitted_at) DESC
  LIMIT GREATEST(LEAST(_limit, 500), 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_ledger(INTEGER) TO anon, authenticated;

-- Admin anchor builder: collects unanchored verified attestations and creates a Merkle root.
CREATE OR REPLACE FUNCTION public.build_mining_anchor(_period_minutes INTEGER DEFAULT 1440)
RETURNS public.mining_anchors
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  _uid UUID := auth.uid();
  _ids UUID[];
  _hashes TEXT[];
  _root TEXT;
  _row public.mining_anchors;
  _start TIMESTAMPTZ := now() - make_interval(mins => GREATEST(_period_minutes, 1));
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT array_agg(id ORDER BY verified_at), array_agg(attestation_hash ORDER BY verified_at)
    INTO _ids, _hashes
  FROM public.mining_attestations
  WHERE status IN ('verified', 'minted')
    AND verified_at >= _start
    AND NOT EXISTS (
      SELECT 1 FROM public.mining_anchors a
      WHERE mining_attestations.id = ANY(a.attestation_ids)
    );

  IF _ids IS NULL OR array_length(_ids, 1) = 0 THEN
    RAISE EXCEPTION 'No unanchored verified attestations in window';
  END IF;

  -- Compute a simple Merkle-style root: sha256 of concatenated sorted hashes.
  _root := encode(
    extensions.digest(array_to_string(_hashes, ''), 'sha256'),
    'hex'
  );

  INSERT INTO public.mining_anchors(period_start, period_end, merkle_root,
                                     attestation_count, attestation_ids, created_by)
  VALUES (_start, now(), _root, array_length(_ids, 1), _ids, _uid)
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_mining_anchor(INTEGER) TO authenticated;
