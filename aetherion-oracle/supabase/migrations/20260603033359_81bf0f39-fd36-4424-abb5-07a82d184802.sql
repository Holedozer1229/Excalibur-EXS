
-- Revoke broad EXECUTE on all public SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consume_query_quota(uuid, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credit_referral_invoice(uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_tier_payment(uuid, text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.credits_balance(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_tier_state(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;

-- Keep referral helpers callable by authenticated users (they self-attribute via auth.uid())
GRANT EXECUTE ON FUNCTION public.ensure_referral_code(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral_signup(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_mining_attestation(text, text, text, numeric, numeric, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.match_user_memories(extensions.vector, integer, double precision) TO authenticated;

-- has_role is used inside RLS policies (called as the policy owner) — it does NOT need EXECUTE for end users.
-- spend_credits / consume_query_quota / credit_referral_invoice / apply_tier_payment / get_user_tier_state / credits_balance
-- should only be called from edge functions using the service role, which always has EXECUTE.

-- Stripe webhook idempotency — unique pkey on event_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'processed_stripe_events_pkey'
  ) THEN
    ALTER TABLE public.processed_stripe_events
      ADD CONSTRAINT processed_stripe_events_pkey PRIMARY KEY (event_id);
  END IF;
END $$;
