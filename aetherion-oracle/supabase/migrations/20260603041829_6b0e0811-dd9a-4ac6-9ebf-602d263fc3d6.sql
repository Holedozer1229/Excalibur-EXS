-- 1) codex_state: explicit deny for client writes (service role bypasses RLS)
DROP POLICY IF EXISTS "deny client insert codex_state" ON public.codex_state;
DROP POLICY IF EXISTS "deny client update codex_state" ON public.codex_state;
DROP POLICY IF EXISTS "deny client delete codex_state" ON public.codex_state;

CREATE POLICY "deny client insert codex_state"
  ON public.codex_state FOR INSERT TO anon, authenticated
  WITH CHECK (false);

CREATE POLICY "deny client update codex_state"
  ON public.codex_state FOR UPDATE TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "deny client delete codex_state"
  ON public.codex_state FOR DELETE TO anon, authenticated
  USING (false);

-- 2) mining_attestations: prevent tampering with verification-critical fields
DROP POLICY IF EXISTS "Users update own attestations" ON public.mining_attestations;

CREATE POLICY "Users update own attestations"
  ON public.mining_attestations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND verified_at IS NULL
    AND verifier_note IS NULL
    AND onchain_tx_hash IS NULL
    -- Pin immutable fields to their existing values
    AND attestation_hash = (SELECT attestation_hash FROM public.mining_attestations WHERE id = mining_attestations.id)
    AND wallet_address  IS NOT DISTINCT FROM (SELECT wallet_address  FROM public.mining_attestations WHERE id = mining_attestations.id)
    AND harmony         IS NOT DISTINCT FROM (SELECT harmony         FROM public.mining_attestations WHERE id = mining_attestations.id)
    AND sponge_harmonic IS NOT DISTINCT FROM (SELECT sponge_harmonic FROM public.mining_attestations WHERE id = mining_attestations.id)
    AND vitality        IS NOT DISTINCT FROM (SELECT vitality        FROM public.mining_attestations WHERE id = mining_attestations.id)
    AND word            =                    (SELECT word            FROM public.mining_attestations WHERE id = mining_attestations.id)
    AND round_number    =                    (SELECT round_number    FROM public.mining_attestations WHERE id = mining_attestations.id)
    AND user_id         =                    (SELECT user_id         FROM public.mining_attestations WHERE id = mining_attestations.id)
  );