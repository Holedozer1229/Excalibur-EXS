-- 1. Lock down profiles SELECT
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- 2. Revoke execute from anon/public on sensitive SECURITY DEFINER funcs
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_tier_state(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.consume_query_quota(uuid, integer) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.validate_wallet_address() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public;