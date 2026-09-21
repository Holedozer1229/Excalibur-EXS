
REVOKE EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.record_referral_signup(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.credit_referral_invoice(uuid, integer, text) FROM anon, authenticated, public;
-- credits_balance and ensure_referral_code remain callable by signed-in users
REVOKE EXECUTE ON FUNCTION public.credits_balance(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.ensure_referral_code(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.credits_balance(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(uuid) TO authenticated;
