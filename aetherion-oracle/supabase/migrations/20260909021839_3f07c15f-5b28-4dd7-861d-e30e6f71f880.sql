CREATE TABLE public.cross_chain_nodes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chain text NOT NULL,
  tick text NOT NULL,
  standard text NOT NULL,
  venue text NOT NULL,
  note text NOT NULL,
  accent text NOT NULL DEFAULT 'text-primary',
  href text NOT NULL DEFAULT '/tokenomics',
  edge_to text,
  edge_label text,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.cross_chain_nodes TO anon;
GRANT SELECT ON public.cross_chain_nodes TO authenticated;
GRANT ALL ON public.cross_chain_nodes TO service_role;

ALTER TABLE public.cross_chain_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cross-chain nodes are publicly readable"
  ON public.cross_chain_nodes FOR SELECT
  USING (active = true);

CREATE POLICY "Admins manage cross-chain nodes"
  ON public.cross_chain_nodes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_cross_chain_nodes_updated_at
  BEFORE UPDATE ON public.cross_chain_nodes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.cross_chain_nodes (chain, tick, standard, venue, note, accent, href, edge_to, edge_label, sort_order) VALUES
('Ethereum','SKYNT','ERC-20','WETH pair','Pool depth anchors the reference floor P₀ for the bonding curve.','text-primary','/token/skynt','wURUU','WETH → P₀ floor',1),
('zkSync Era','URUU','ERC-20 · live','zkSync Era','Token is live. Wrap and curve are calculators only.','text-primary','/token/uruu','wURUU','ETH→WETH live · URUU wrap not live',2),
('Solana','wURUU','SPL · wrapped','Custom bonding curve','P(s) = P₀ (1 + s/S)ⁿ. Disclosed 1% cap. Sell is open.','text-accent','/token/wuruu',NULL,NULL,3),
('Bitcoin','ATART','BRC-20','UniSat','Reading receipts route a BRC-20 bonus into the curve.','text-gold','/claim/tart','wURUU','BRC-20 bonus',4),
('EXS Tetra-PoW','EXS','Proof-of-Forge','excaliburcrypto.com','Tetra-PoW forges mint EXS; host lattice for Aetherion.','text-amber-300','/exs','AETX','Excalibur mythos merge',5);