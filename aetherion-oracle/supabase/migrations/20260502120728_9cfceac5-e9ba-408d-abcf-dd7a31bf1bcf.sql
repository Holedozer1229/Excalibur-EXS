-- Restrict execute on remaining SECURITY DEFINER functions to service_role only.
REVOKE EXECUTE ON FUNCTION public.consume_query_quota(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.consume_query_quota(UUID, INTEGER) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_mining_attestation(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.record_mining_attestation(TEXT, TEXT, TEXT, NUMERIC, NUMERIC, TEXT, TEXT, TEXT) TO authenticated, service_role;
-- record_mining_attestation MUST stay callable by authenticated (Mining UI uses user JWT).
-- match_user_memories also needs authenticated (called via user client in aetherion fn).
-- get_user_tier_state already restricted.