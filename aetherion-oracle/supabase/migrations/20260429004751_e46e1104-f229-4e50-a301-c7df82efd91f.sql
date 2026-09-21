-- Revoke from authenticated for server-only functions
REVOKE EXECUTE ON FUNCTION public.get_user_tier_state(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_query_quota(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_wallet_address() FROM authenticated;

-- Move pgvector to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;
ALTER EXTENSION vector SET SCHEMA extensions;