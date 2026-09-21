import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Copy, Eye, EyeOff, ShieldAlert, Sparkles } from "lucide-react";
import { generateWallet, createWalletFromMnemonic, type AetherionWallet } from "@/lib/aetherionWallet";

export default function AetherionWalletPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);
  const [ethAddress, setEthAddress] = useState<string | null>(null);

  const [wallet, setWallet] = useState<AetherionWallet | null>(null);
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [savedConfirmed, setSavedConfirmed] = useState(false);
  const [importMnemonic, setImportMnemonic] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("profiles")
        .select("btc_address, wallet_address")
        .eq("user_id", user.id)
        .maybeSingle();
      setBtcAddress(data?.btc_address ?? null);
      setEthAddress(data?.wallet_address ?? null);
      setLoading(false);
    })();
  }, []);

  function handleGenerate() {
    const w = generateWallet();
    setWallet(w);
    setShowMnemonic(false);
    setSavedConfirmed(false);
  }

  function handleImport() {
    try {
      const w = createWalletFromMnemonic(importMnemonic.trim().toLowerCase());
      setWallet(w);
      setShowMnemonic(false);
      setSavedConfirmed(true); // user already has the mnemonic
      setImportMnemonic("");
    } catch (e) {
      toast({ title: "Invalid mnemonic", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  }

  async function handleSaveAddresses() {
    if (!wallet || !savedConfirmed) return;
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ btc_address: wallet.btcAddress, wallet_address: wallet.ethAddress })
        .eq("user_id", user.id);
      if (error) throw error;
      setBtcAddress(wallet.btcAddress);
      setEthAddress(wallet.ethAddress);
      setWallet(null);
      toast({ title: "Wallet activated", description: "Addresses saved. Private keys stay in your control." });
    } catch (e) {
      toast({ title: "Save failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  function copy(label: string, value: string) {
    navigator.clipboard.writeText(value);
    toast({ title: `${label} copied` });
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Aetherion Wallet</h3>
          <Badge variant={btcAddress ? "default" : "secondary"}>{btcAddress ? "active" : "not created"}</Badge>
        </div>

        {btcAddress && (
          <div className="space-y-2 text-sm">
            <div>
              <Label className="text-xs text-muted-foreground">BTC (Taproot)</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{btcAddress}</code>
                <Button size="icon" variant="ghost" aria-label="Copy BTC address" onClick={() => copy("BTC address", btcAddress)}><Copy className="h-3 w-3" /></Button>
              </div>
            </div>
            {ethAddress && (
              <div>
                <Label className="text-xs text-muted-foreground">ETH</Label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">{ethAddress}</code>
                  <Button size="icon" variant="ghost" aria-label="Copy ETH address" onClick={() => copy("ETH address", ethAddress)}><Copy className="h-3 w-3" /></Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>

      {!wallet && !btcAddress && (
        <Card className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">
            Generate a non-custodial wallet for BTC (BRC-20 AETX) and ETH. Keys are created in your browser. We never see or store them.
          </p>
          <Button onClick={handleGenerate} className="w-full">Create Aetherion Wallet</Button>

          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground">Import existing seed phrase</summary>
            <div className="mt-2 space-y-2">
              <Input
                value={importMnemonic}
                onChange={(e) => setImportMnemonic(e.target.value)}
                placeholder="12 or 24 words separated by spaces"
              />
              <Button size="sm" variant="outline" onClick={handleImport} disabled={!importMnemonic.trim()}>
                Import
              </Button>
            </div>
          </details>
        </Card>
      )}

      {wallet && (
        <Card className="space-y-4 border-amber-500/40 bg-amber-500/5 p-5">
          <div className="flex items-start gap-2">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div className="text-sm">
              <p className="font-semibold text-amber-200">Save your seed phrase NOW</p>
              <p className="text-muted-foreground">This is the only time it will ever be shown. Anyone with these words controls the wallet. Write them down or store in a password manager.</p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wide">Seed phrase</Label>
              <Button size="sm" variant="ghost" onClick={() => setShowMnemonic((v) => !v)}>
                {showMnemonic ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                {showMnemonic ? "Hide" : "Reveal"}
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-2 rounded bg-background/60 p-3 font-mono text-sm">
              {wallet.mnemonic.split(" ").map((word, i) => (
                <div key={i} className="flex gap-1">
                  <span className="text-muted-foreground">{i + 1}.</span>
                  <span>{showMnemonic ? word : "••••"}</span>
                </div>
              ))}
            </div>
            <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => copy("Seed phrase", wallet.mnemonic)}>
              <Copy className="mr-2 h-3 w-3" /> Copy seed phrase
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <Label className="text-xs text-muted-foreground">BTC (Taproot)</Label>
              <code className="block truncate rounded bg-muted px-2 py-1">{wallet.btcAddress}</code>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">ETH</Label>
              <code className="block truncate rounded bg-muted px-2 py-1">{wallet.ethAddress}</code>
            </div>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox checked={savedConfirmed} onCheckedChange={(v) => setSavedConfirmed(v === true)} />
            <span>I have securely saved my seed phrase. I understand it cannot be recovered if lost.</span>
          </label>

          <div className="flex gap-2">
            <Button onClick={handleSaveAddresses} disabled={!savedConfirmed || busy} className="flex-1">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Activate wallet
            </Button>
            <Button variant="ghost" onClick={() => setWallet(null)}>Cancel</Button>
          </div>
        </Card>
      )}
    </div>
  );
}
