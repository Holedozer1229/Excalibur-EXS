
CREATE TABLE public.brc20_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tick text NOT NULL,
  max numeric NOT NULL,
  lim numeric NOT NULL,
  dec integer NOT NULL DEFAULT 18,
  network text NOT NULL DEFAULT 'mainnet',
  deployer_user_id uuid NOT NULL,
  deployer_btc_address text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  reveal_tx text,
  inscription_id text,
  fee_rate integer,
  wallet_used text,
  raw_inscription_json text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tick, network)
);

GRANT SELECT, INSERT, UPDATE ON public.brc20_tokens TO authenticated;
GRANT SELECT ON public.brc20_tokens TO anon;
GRANT ALL ON public.brc20_tokens TO service_role;

ALTER TABLE public.brc20_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view inscribed tokens"
  ON public.brc20_tokens FOR SELECT
  USING (status = 'inscribed');

CREATE POLICY "Deployer views own tokens"
  ON public.brc20_tokens FOR SELECT
  USING (auth.uid() = deployer_user_id);

CREATE POLICY "Admins view all tokens"
  ON public.brc20_tokens FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Deployer inserts own tokens"
  ON public.brc20_tokens FOR INSERT
  WITH CHECK (auth.uid() = deployer_user_id);

CREATE POLICY "Deployer updates own tokens"
  ON public.brc20_tokens FOR UPDATE
  USING (auth.uid() = deployer_user_id);

CREATE POLICY "Admins update all tokens"
  ON public.brc20_tokens FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_brc20_tokens_updated_at
  BEFORE UPDATE ON public.brc20_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.brc20_operations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.brc20_tokens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  op text NOT NULL,
  amount numeric NOT NULL,
  to_address text,
  reveal_tx text,
  inscription_id text,
  status text NOT NULL DEFAULT 'draft',
  raw_inscription_json text NOT NULL,
  wallet_used text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.brc20_operations TO authenticated;
GRANT ALL ON public.brc20_operations TO service_role;

ALTER TABLE public.brc20_operations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own operations"
  ON public.brc20_operations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all operations"
  ON public.brc20_operations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users insert own operations"
  ON public.brc20_operations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own operations"
  ON public.brc20_operations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_brc20_operations_updated_at
  BEFORE UPDATE ON public.brc20_operations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_brc20_tokens_deployer ON public.brc20_tokens(deployer_user_id);
CREATE INDEX idx_brc20_tokens_status ON public.brc20_tokens(status);
CREATE INDEX idx_brc20_operations_token ON public.brc20_operations(token_id);
CREATE INDEX idx_brc20_operations_user ON public.brc20_operations(user_id);
