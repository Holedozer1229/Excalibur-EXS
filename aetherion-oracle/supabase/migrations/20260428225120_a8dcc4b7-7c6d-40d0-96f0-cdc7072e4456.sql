-- ─────────────────────────────────────────────────────────────
-- 1. Lock down existing SECURITY DEFINER functions
-- ─────────────────────────────────────────────────────────────
REVOKE EXECUTE ON FUNCTION public.consume_query_quota(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_tier_state(uuid)          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_user_memories(vector, integer, double precision) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.consume_query_quota(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_tier_state(uuid)          TO service_role;
GRANT EXECUTE ON FUNCTION public.match_user_memories(vector, integer, double precision) TO authenticated, service_role;

-- ─────────────────────────────────────────────────────────────
-- 2. Mining attestations table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.mining_attestations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL,
  round_number    INTEGER NOT NULL,
  word            TEXT NOT NULL,
  query_excerpt   TEXT,
  response_excerpt TEXT,
  harmony         NUMERIC,
  sponge_harmonic NUMERIC,
  vitality        TEXT,
  attestation_hash TEXT NOT NULL,
  zk_proof_ref    TEXT,
  wallet_address  TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','verified','rejected','minted')),
  verifier_note   TEXT,
  onchain_tx_hash TEXT,
  submitted_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, round_number)
);

CREATE INDEX idx_mining_attestations_user ON public.mining_attestations(user_id, round_number DESC);
CREATE INDEX idx_mining_attestations_hash ON public.mining_attestations(attestation_hash);

ALTER TABLE public.mining_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own attestations"
  ON public.mining_attestations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own attestations"
  ON public.mining_attestations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own attestations"
  ON public.mining_attestations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_mining_attestations_updated_at
  BEFORE UPDATE ON public.mining_attestations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────
-- 3. RPC: record a mining attestation (auto round number)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_mining_attestation(
  _word TEXT,
  _query_excerpt TEXT,
  _response_excerpt TEXT,
  _harmony NUMERIC,
  _sponge_harmonic NUMERIC,
  _vitality TEXT,
  _attestation_hash TEXT,
  _zk_proof_ref TEXT DEFAULT NULL
) RETURNS public.mining_attestations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _wallet TEXT;
  _next_round INTEGER;
  _row public.mining_attestations;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF _attestation_hash IS NULL OR length(_attestation_hash) < 8 THEN
    RAISE EXCEPTION 'attestation_hash required';
  END IF;

  SELECT wallet_address INTO _wallet FROM public.profiles WHERE user_id = _uid;

  SELECT COALESCE(MAX(round_number), 0) + 1
    INTO _next_round
    FROM public.mining_attestations
    WHERE user_id = _uid;

  INSERT INTO public.mining_attestations (
    user_id, round_number, word, query_excerpt, response_excerpt,
    harmony, sponge_harmonic, vitality, attestation_hash, zk_proof_ref,
    wallet_address
  ) VALUES (
    _uid, _next_round, _word, _query_excerpt, _response_excerpt,
    _harmony, _sponge_harmonic, _vitality, _attestation_hash, _zk_proof_ref,
    _wallet
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_mining_attestation(TEXT,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_mining_attestation(TEXT,TEXT,TEXT,NUMERIC,NUMERIC,TEXT,TEXT,TEXT) TO authenticated, service_role;