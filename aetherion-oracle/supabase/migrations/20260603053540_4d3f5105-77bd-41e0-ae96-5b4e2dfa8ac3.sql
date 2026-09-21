DROP POLICY IF EXISTS "Users update own attestations" ON public.mining_attestations;

CREATE POLICY "Users update own attestations"
ON public.mining_attestations
FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) AND (status = 'pending'))
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
  AND verified_at IS NULL
  AND verifier_note IS NULL
  AND onchain_tx_hash IS NULL
  AND attestation_hash = (SELECT m.attestation_hash FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
  AND wallet_address IS NOT DISTINCT FROM (SELECT m.wallet_address FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
  AND harmony IS NOT DISTINCT FROM (SELECT m.harmony FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
  AND sponge_harmonic IS NOT DISTINCT FROM (SELECT m.sponge_harmonic FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
  AND vitality IS NOT DISTINCT FROM (SELECT m.vitality FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
  AND word = (SELECT m.word FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
  AND round_number = (SELECT m.round_number FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
  AND user_id = (SELECT m.user_id FROM public.mining_attestations m WHERE m.id = mining_attestations.id)
);