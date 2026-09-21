-- Tier payment ledger for on-chain crypto upgrades.
-- Each row is a verified blockchain transaction that grants the user a tier subscription.

CREATE TABLE IF NOT EXISTS public.tier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('acolyte','oracle_pro')),
  chain_id INTEGER NOT NULL,
  tx_hash TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_wei NUMERIC NOT NULL,
  amount_eth NUMERIC NOT NULL,
  required_eth NUMERIC NOT NULL,
  block_number BIGINT,
  status TEXT NOT NULL DEFAULT 'verified',
  period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tier_payments_tx_unique UNIQUE (chain_id, tx_hash)
);

CREATE INDEX IF NOT EXISTS idx_tier_payments_user ON public.tier_payments(user_id, period_end DESC);

ALTER TABLE public.tier_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.tier_payments
  FOR SELECT USING (auth.uid() = user_id);
-- INSERT/UPDATE intentionally restricted: only service role (verify-payment fn) writes.

-- Sync subscribers row from latest active payment.
CREATE OR REPLACE FUNCTION public.apply_tier_payment(_user_id UUID, _email TEXT, _tier TEXT, _period_end TIMESTAMPTZ)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier, subscription_end)
  VALUES (_user_id, _email, true, _tier, _period_end)
  ON CONFLICT (user_id) DO UPDATE
    SET subscribed = true,
        subscription_tier = EXCLUDED.subscription_tier,
        subscription_end = GREATEST(public.subscribers.subscription_end, EXCLUDED.subscription_end),
        email = COALESCE(public.subscribers.email, EXCLUDED.email),
        updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_tier_payment(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_tier_payment(UUID, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- Need unique constraint on subscribers.user_id for ON CONFLICT.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscribers_user_id_key'
  ) THEN
    ALTER TABLE public.subscribers ADD CONSTRAINT subscribers_user_id_key UNIQUE (user_id);
  END IF;
END $$;