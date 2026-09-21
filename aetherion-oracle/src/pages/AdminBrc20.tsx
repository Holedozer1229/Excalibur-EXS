import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Wallet } from "lucide-react";
import { detectWallets, connect, inscribeText, type Wallet as BtcWallet } from "@/lib/btcWallet";

interface TokenRow {
  id: string;
  tick: string;
  max: number | string;
  lim: number | string;
  status: string;
  reveal_tx: string | null;
  inscription_id: string | null;
  created_at: string;
}

const ADDR_KEY = "aetx_deployer_btc_address";

export default function AdminBrc20() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [tick] = useState("ATART");
  const [max, setMax] = useState("21000000");
  const [lim, setLim] = useState("1000");
  const [dec, setDec] = useState("18");
  const [feeRate, setFeeRate] = useState("10");
  const [btcAddress, setBtcAddress] = useState(() => localStorage.getItem(ADDR_KEY) ?? "");

  const [built, setBuilt] = useState<{ tokenId: string; json: string; bytes: number } | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<BtcWallet | null>(null);
  const [manualTx, setManualTx] = useState("");
  const [busy, setBusy] = useState(false);
  const [tokens, setTokens] = useState<TokenRow[]>([]);

  const wallets = detectWallets();

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
      setIsAdmin(admin);
      if (admin) await refreshTokens();
      setLoading(false);
    })();
  }, [navigate]);

  async function refreshTokens() {
    const { data } = await supabase.from("brc20_tokens").select("*").order("created_at", { ascending: false }).limit(20);
    setTokens((data ?? []) as unknown as TokenRow[]);
  }

  async function handleBuild() {
    if (!btcAddress) { toast({ title: "BTC address required", variant: "destructive" }); return; }
    localStorage.setItem(ADDR_KEY, btcAddress);
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("brc20-build", {
        body: { op: "deploy", tick, max, lim, dec, btc_address: btcAddress, fee_rate: Number(feeRate), network: "mainnet" },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        const err = data as any;
        if (err.error === "tick_taken") {
          toast({ title: `${tick} is already inscribed`, description: `Suggestions: ${err.suggestions?.join(", ")}`, variant: "destructive" });
        } else {
          toast({ title: "Build failed", description: JSON.stringify(err.error), variant: "destructive" });
        }
        return;
      }
      const d = data as { tokenId: string; json: string; bytes: number };
      setBuilt(d);
      toast({ title: "Inscription built", description: `${d.bytes} bytes — ready to sign` });
      await refreshTokens();
    } catch (e) {
      toast({ title: "Build error", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function handleConnect(w: BtcWallet) {
    try {
      const { address } = await connect(w);
      setConnectedWallet(w);
      if (!btcAddress) { setBtcAddress(address); localStorage.setItem(ADDR_KEY, address); }
      toast({ title: `${w} connected`, description: address });
    } catch (e) {
      toast({ title: `${w} connect failed`, description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  async function handleInscribe(w: BtcWallet) {
    if (!built) return;
    setBusy(true);
    try {
      const { revealTx, inscriptionId } = await inscribeText(w, built.json);
      await confirmInscription(revealTx, inscriptionId, w);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.startsWith("UNISAT_HOSTED_FLOW")) {
        toast({ title: "Complete inscription in UniSat tab", description: "Paste the reveal txid below when broadcast." });
      } else {
        toast({ title: "Inscribe failed", description: msg, variant: "destructive" });
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmInscription(revealTx: string, inscriptionId: string | undefined, w: BtcWallet) {
    if (!built) return;
    const { data, error } = await supabase.functions.invoke("brc20-confirm", {
      body: { tokenId: built.tokenId, revealTx, inscriptionId, wallet: w },
    });
    if (error || (data as any)?.error) {
      toast({ title: "Confirm failed", description: error?.message ?? (data as any)?.error, variant: "destructive" });
      return;
    }
    toast({ title: "ATART inscribed", description: revealTx });
    setBuilt(null);
    setManualTx("");
    await refreshTokens();
  }

  async function handleManualConfirm() {
    if (!manualTx || manualTx.length < 64) { toast({ title: "Enter a valid txid", variant: "destructive" }); return; }
    await confirmInscription(manualTx, `${manualTx}i0`, "unisat");
  }

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!isAdmin) return <div className="p-8 text-center text-muted-foreground">Admin only.</div>;

  return (
    <div className="container mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">BRC-20 Deploy — ATART</h1>
          <p className="text-sm text-muted-foreground">Mainnet. Wallet signs and pays BTC fees. Aetherion Tarot token.</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/btc-claims">Claim queue →</Link>
        </Button>
      </div>

      <Card className="space-y-4 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Tick</Label>
            <Input value={tick} disabled />
          </div>
          <div>
            <Label>Decimals</Label>
            <Input value={dec} onChange={(e) => setDec(e.target.value)} />
          </div>
          <div>
            <Label>Max supply</Label>
            <Input value={max} onChange={(e) => setMax(e.target.value)} />
          </div>
          <div>
            <Label>Mint limit</Label>
            <Input value={lim} onChange={(e) => setLim(e.target.value)} />
          </div>
          <div>
            <Label>Fee rate (sats/vB)</Label>
            <Input value={feeRate} onChange={(e) => setFeeRate(e.target.value)} />
          </div>
          <div>
            <Label>Deployer BTC address</Label>
            <Input value={btcAddress} onChange={(e) => setBtcAddress(e.target.value)} placeholder="bc1p..." />
          </div>
        </div>
        <Button onClick={handleBuild} disabled={busy || !btcAddress}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Build deploy inscription
        </Button>
      </Card>

      {built && (
        <Card className="space-y-4 p-6">
          <div>
            <Label>Canonical JSON ({built.bytes} bytes)</Label>
            <pre className="mt-2 rounded bg-muted p-3 text-xs">{built.json}</pre>
          </div>

          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <Button key={`c-${w}`} variant="outline" size="sm" onClick={() => handleConnect(w)}>
                <Wallet className="mr-2 h-4 w-4" />
                Connect {w}
                {connectedWallet === w && <Badge className="ml-2" variant="secondary">connected</Badge>}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {wallets.map((w) => (
              <Button key={`i-${w}`} onClick={() => handleInscribe(w)} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Inscribe with {w}
              </Button>
            ))}
          </div>

          <div className="border-t pt-4">
            <Label>Or paste reveal txid (UniSat hosted flow)</Label>
            <div className="mt-2 flex gap-2">
              <Input value={manualTx} onChange={(e) => setManualTx(e.target.value)} placeholder="reveal txid" />
              <Button variant="secondary" onClick={handleManualConfirm}>Confirm</Button>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h2 className="mb-3 font-semibold">Recent deploys</h2>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No deploys yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {tokens.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded border p-3">
                <div>
                  <div className="font-mono">{t.tick} · max {t.max} · lim {t.lim}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.status === "inscribed" ? "default" : "secondary"}>{t.status}</Badge>
                  {t.reveal_tx && (
                    <a href={`https://mempool.space/tx/${t.reveal_tx}`} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                      <ExternalLink className="inline h-3 w-3" /> tx
                    </a>
                  )}
                  {t.inscription_id && (
                    <a href={`https://ordinals.com/inscription/${t.inscription_id}`} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                      <ExternalLink className="inline h-3 w-3" /> ord
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
