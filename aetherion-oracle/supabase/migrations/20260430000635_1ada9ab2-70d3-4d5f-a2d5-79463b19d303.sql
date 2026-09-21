REVOKE EXECUTE ON FUNCTION public.get_user_tier_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_tier_state(uuid) TO service_role;