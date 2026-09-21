-- 1. Security: add WITH CHECK to owner-update policies so rows cannot be reassigned to another user
DROP POLICY IF EXISTS "Deployer updates own tokens" ON public.brc20_tokens;
CREATE POLICY "Deployer updates own tokens"
ON public.brc20_tokens
FOR UPDATE
TO authenticated
USING (auth.uid() = deployer_user_id)
WITH CHECK (auth.uid() = deployer_user_id);

DROP POLICY IF EXISTS "Users update own operations" ON public.brc20_operations;
CREATE POLICY "Users update own operations"
ON public.brc20_operations
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. URUU dashboard tables
CREATE TABLE public.rpc_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  label text NOT NULL,
  chain_id integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rpc_endpoints TO anon;
GRANT SELECT ON public.rpc_endpoints TO authenticated;
GRANT ALL ON public.rpc_endpoints TO service_role;

ALTER TABLE public.rpc_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "RPC endpoints are public read"
ON public.rpc_endpoints FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage rpc endpoints"
ON public.rpc_endpoints FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.validator_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  address text NOT NULL,
  bond numeric NOT NULL DEFAULT 0,
  last_seen timestamptz NOT NULL DEFAULT now(),
  raw_json jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX validator_cache_address_key ON public.validator_cache (address);

GRANT SELECT ON public.validator_cache TO anon;
GRANT SELECT ON public.validator_cache TO authenticated;
GRANT ALL ON public.validator_cache TO service_role;

ALTER TABLE public.validator_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Validator cache is public read"
ON public.validator_cache FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins manage validator cache"
ON public.validator_cache FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.rpc_endpoints (url, label, chain_id)
VALUES ('https://ethereum-rpc.publicnode.com', 'Ethereum Mainnet (demo)', 1);
