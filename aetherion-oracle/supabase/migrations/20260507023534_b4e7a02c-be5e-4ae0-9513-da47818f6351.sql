CREATE TABLE public.tier_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  from_tier text,
  to_tier text NOT NULL,
  change_type text NOT NULL CHECK (change_type IN ('immediate','scheduled','renewal','canceled','payment_failed','payment_recovered','admin_grant')),
  effective_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'stripe',
  stripe_event_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tier_change_audit_user ON public.tier_change_audit (user_id, created_at DESC);
CREATE INDEX idx_tier_change_audit_event ON public.tier_change_audit (stripe_event_id);
CREATE UNIQUE INDEX uq_tier_change_audit_event ON public.tier_change_audit (stripe_event_id) WHERE stripe_event_id IS NOT NULL;

ALTER TABLE public.tier_change_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all tier audit"
  ON public.tier_change_audit FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view their own tier audit"
  ON public.tier_change_audit FOR SELECT
  USING (auth.uid() = user_id);
