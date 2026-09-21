
-- Enable scheduling extensions for the 24/7 auto-mine cron
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: is this user eligible for auto-verified / 24/7 mining?
CREATE OR REPLACE FUNCTION public.is_auto_mine_eligible(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.subscribers
      WHERE user_id = _user_id
        AND COALESCE(subscribed, false) = true
        AND COALESCE(subscription_tier, '') = 'oracle_pro'
    );
$$;

-- Upgrade record_mining_attestation: admins + oracle_pro get instant verification
CREATE OR REPLACE FUNCTION public.record_mining_attestation(
  _word text, _query_excerpt text, _response_excerpt text,
  _harmony numeric, _sponge_harmonic numeric, _vitality text,
  _attestation_hash text, _zk_proof_ref text DEFAULT NULL::text
)
RETURNS mining_attestations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  _uid UUID := auth.uid();
  _wallet TEXT;
  _next_round INTEGER;
  _row public.mining_attestations;
  _auto BOOLEAN;
  _status TEXT := 'pending';
  _verified_at TIMESTAMPTZ := NULL;
  _note TEXT := NULL;
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

  _auto := public.is_auto_mine_eligible(_uid);
  IF _auto THEN
    _status := 'verified';
    _verified_at := now();
    _note := 'auto-verified: tier eligible (admin / oracle_pro)';
  END IF;

  INSERT INTO public.mining_attestations (
    user_id, round_number, word, query_excerpt, response_excerpt,
    harmony, sponge_harmonic, vitality, attestation_hash, zk_proof_ref,
    wallet_address, status, verified_at, verifier_note
  ) VALUES (
    _uid, _next_round, _word, _query_excerpt, _response_excerpt,
    _harmony, _sponge_harmonic, _vitality, _attestation_hash, _zk_proof_ref,
    _wallet, _status, _verified_at, _note
  )
  RETURNING * INTO _row;

  RETURN _row;
END;
$function$;

-- 24/7 auto-mine: heartbeat attestation for every eligible user.
-- Designed to be called from pg_cron OR from an edge function on a schedule.
CREATE OR REPLACE FUNCTION public.auto_mine_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _u RECORD;
  _next INTEGER;
  _hash TEXT;
  _inserted INTEGER := 0;
BEGIN
  FOR _u IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'admin'
    UNION
    SELECT s.user_id
    FROM public.subscribers s
    WHERE COALESCE(s.subscribed, false) = true
      AND COALESCE(s.subscription_tier, '') = 'oracle_pro'
  LOOP
    SELECT COALESCE(MAX(round_number), 0) + 1 INTO _next
      FROM public.mining_attestations WHERE user_id = _u.user_id;

    _hash := encode(
      extensions.digest(
        _u.user_id::text || ':' || _next::text || ':' || extract(epoch from now())::text,
        'sha256'
      ),
      'hex'
    );

    INSERT INTO public.mining_attestations (
      user_id, round_number, word, query_excerpt, response_excerpt,
      harmony, sponge_harmonic, vitality, attestation_hash,
      wallet_address, status, verified_at, verifier_note
    )
    SELECT _u.user_id, _next, 'excalibur',
           'auto-mine heartbeat', 'auto-mine heartbeat',
           NULL, NULL, 'ASCEND', _hash,
           p.wallet_address, 'verified', now(),
           'auto-mined: 24/7 tier heartbeat'
    FROM public.profiles p WHERE p.user_id = _u.user_id;

    _inserted := _inserted + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'inserted', _inserted, 'at', now());
END;
$$;

REVOKE EXECUTE ON FUNCTION public.auto_mine_tick() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.auto_mine_tick() TO service_role;
REVOKE EXECUTE ON FUNCTION public.is_auto_mine_eligible(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.is_auto_mine_eligible(uuid) TO authenticated, service_role;
