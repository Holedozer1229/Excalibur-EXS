import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Wallet } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import AetxDeployStatus from "@/components/AetxDeployStatus";

import { detectWallets, connect, inscribeText, type Wallet as BtcWallet } from "@/lib/btcWallet";

interface TokenInfo {
  id: string;
  tick: string;
  max: number | string;
  lim: number | string;
  status: string;
  inscription_id: string | null;
  reveal_tx: string | null;
}

export default function TokenAetx() {
  const { toast } = useToast();
  const [token, setToken] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("1000");
  const [busy, setBusy] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  const wallets = detectWallets();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSignedIn(!!session);
      const { data } = await supabase.rpc("get_public_brc20_tokens", { _tick: "AETX", _network: "mainnet" });
      const row = Array.isArray(data) ? data[0] : null;
      setToken((row as unknown as TokenInfo) ?? null);
      setLoading(false);
    })();
  }, []);

  async function handleMint(w: BtcWallet) {
    if (!signedIn) { toast({ title: "Sign in to mint", variant: "destructive" }); return; }
    if (!token) return;
    setBusy(true);
    try {
      const { data: built, error } = await supabase.functions.invoke("brc20-build", {
        body: { op: "mint", tick: "AETX", amt: amount, btc_address: "n/a", network: "mainnet" },
      });
      if (error) throw error;
      const json = (built as any).json as string;
      const { revealTx, inscriptionId } = await inscribeText(w, json);
      const { error: cErr } = await supabase.functions.invoke("brc20-confirm", {
        body: { revealTx, inscriptionId, wallet: w, op: "mint", tick: "AETX", amount, rawInscriptionJson: json },
      });
      if (cErr) throw cErr;
      toast({ title: "Mint inscribed", description: revealTx });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("UNISAT_HOSTED_FLOW")) {
        toast({ title: "Complete in UniSat tab", description: "Mint inscription was prepared." });
      } else {
        toast({ title: "Mint failed", description: msg, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <PageHead
        title="AETX — Aetherion Excalibur BRC-20 on Bitcoin"
        description="AETX is the Aetherion Excalibur BRC-20 on Bitcoin — max supply 21M, mint limit 1,000. On-chain attestation of EXCALIBUR mining rounds."
        path="/token/aetx"
        ogType="article"
        image={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/og-aetx`}
        imageAlt="AETX BRC-20 live deploy card — inscription ID, tick, and minted progress"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.excaliburcrypto.com/" },
              { "@type": "ListItem", position: 2, name: "Tokenomics", item: "https://www.excaliburcrypto.com/tokenomics" },
              { "@type": "ListItem", position: 3, name: "AETX", item: "https://www.excaliburcrypto.com/token/aetx" },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: "AETX — Aetherion Excalibur BRC-20",
            category: "Cryptocurrency Token",
            description: "AETX BRC-20 token on Bitcoin mainnet. Max supply 21,000,000; mint limit 1,000 per inscription; 18 decimals.",
            brand: { "@type": "Brand", name: "Aetherion" },
            identifier: "81231a6098679a4b8183c6d4695b46666772ee7b09d30b6b1636f8e78be89dfbi0",
            image: "https://static.unisat.space/preview/81231a6098679a4b8183c6d4695b46666772ee7b09d30b6b1636f8e78be89dfbi0",
            url: "https://www.excaliburcrypto.com/token/aetx",
            sameAs: [
              "https://ordinals.com/inscription/81231a6098679a4b8183c6d4695b46666772ee7b09d30b6b1636f8e78be89dfbi0",
              "https://unisat.io/brc20/AETX",
            ],
          },
        ]}
      />
      <header className="text-center">

        <h1 className="text-4xl font-bold tracking-tight">AETX — Aetherion Excalibur BRC-20 on Bitcoin</h1>
        <p className="mt-2 text-sm text-muted-foreground">Aetherion Excalibur — BRC-20 on Bitcoin mainnet</p>
      </header>

      <AetxDeployStatus />

      {!token ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">AETX has not been inscribed yet.</p>
        </Card>
      ) : (
        <>
          <Card className="space-y-2 p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tick</span>
              <span className="font-mono text-lg">{token.tick}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Max supply</span>
              <span className="font-mono">{token.max}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Mint limit / op</span>
              <span className="font-mono">{token.lim}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge>{token.status}</Badge>
            </div>
            {token.reveal_tx && (
              <a href={`https://mempool.space/tx/${token.reveal_tx}`} target="_blank" rel="noopener" className="block text-xs text-primary hover:underline">
                <ExternalLink className="inline h-3 w-3" /> Deploy transaction
              </a>
            )}
            {token.inscription_id && (
              <a href={`https://ordinals.com/inscription/${token.inscription_id}`} target="_blank" rel="noopener" className="block text-xs text-primary hover:underline">
                <ExternalLink className="inline h-3 w-3" /> View inscription
              </a>
            )}
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="font-semibold">Mint AETX</h2>
            <div className="flex gap-2">
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="amount" />
            </div>
            <div className="flex flex-wrap gap-2">
              {wallets.map((w) => (
                <Button key={w} onClick={() => handleMint(w)} disabled={busy}>
                  {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
                  Mint with {w}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">You pay BTC network fees from your wallet. Mint limit per inscription: {token.lim} AETX.</p>
          </Card>
        </>
      )}
    </div>
  );
}
