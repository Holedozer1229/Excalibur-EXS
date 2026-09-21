ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscribers_stripe_customer
  ON public.subscribers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;