-- Captain's cut: retrologarithmic profit drips every 15 minutes to external vault.

CREATE TABLE IF NOT EXISTS public.captains_cut_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_started_at timestamptz NOT NULL DEFAULT date_trunc('day', (now() AT TIME ZONE 'utc')),
  pure_profit_wei numeric NOT NULL DEFAULT 0 CHECK (pure_profit_wei >= 0),
  vault_address text NOT NULL DEFAULT '0xc5a47c9adab637d1caa791cce193079d22c8cb20',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_started_at)
);

CREATE TABLE IF NOT EXISTS public.captains_cut_drips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_started_at timestamptz NOT NULL,
  drip_index integer NOT NULL CHECK (drip_index >= 0 AND drip_index < 96),
  amount_wei numeric NOT NULL CHECK (amount_wei > 0),
  vault_address text NOT NULL,
  tx_hash text,
  status text NOT NULL CHECK (status IN ('pending', 'sent', 'dry_run', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (period_started_at, drip_index)
);

CREATE INDEX IF NOT EXISTS captains_cut_drips_created_idx
  ON public.captains_cut_drips (created_at DESC);

ALTER TABLE public.captains_cut_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captains_cut_drips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read captains cut ledger"
  ON public.captains_cut_ledger FOR SELECT USING (true);

CREATE POLICY "Public read captains cut drips"
  ON public.captains_cut_drips FOR SELECT USING (true);

CREATE POLICY "Service role manages captains cut ledger"
  ON public.captains_cut_ledger FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role manages captains cut drips"
  ON public.captains_cut_drips FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Optional pg_cron (run manually in Supabase SQL editor after deploy):
-- SELECT cron.schedule(
--   'captains-cut-drip',
--   '*/15 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://<project-ref>.supabase.co/functions/v1/captains-cut-worker',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'x-cron-secret', '<CRON_SECRET>'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
