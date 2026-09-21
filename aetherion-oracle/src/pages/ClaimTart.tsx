import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Loader2, Coins, Bitcoin, ShieldCheck, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Claim = {
  id: string;
  amount: number;
  btc_address: string;
  status: string;
  inscription_id: string | null;
  tx_hash: string | null;
  created_at: string;
};

const statusTone: Record<string, string> = {
  pending: "border-amber-500/50 text-amber-300",
  inscribing: "border-sky-500/50 text-sky-300",
  inscribed: "border-emerald-500/50 text-emerald-300",
  failed: "border-destructive/60 text-destructive",
  canceled: "border-muted-foreground/40 text-muted-foreground",
};

const ClaimTart = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [profileBtc, setProfileBtc] = useState<string>("");
  const [btcAddress, setBtcAddress] = useState<string>("");
  const [amount, setAmount] = useState<number>(1);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id;
    if (!uid) {
      setAuthed(false);
      setLoading(false);
      return;
    }
    setAuthed(true);

    const [{ data: bal }, { data: prof }, { data: cs }] = await Promise.all([
      supabase.rpc("tart_balance", { _user_id: uid }),
      supabase.from("profiles").select("btc_address").eq("user_id", uid).maybeSingle(),
      supabase
        .from("tart_claims")
        .select("id, amount, btc_address, status, inscription_id, tx_hash, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setBalance(Number(bal ?? 0));
    setProfileBtc(prof?.btc_address ?? "");
    setBtcAddress((prev) => prev || prof?.btc_address || "");
    setClaims((cs ?? []) as Claim[]);
    setAmount((prev) => Math.max(1, Math.min(prev || 1, Number(bal ?? 0) || 1)));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const canSubmit = useMemo(
    () => authed && amount > 0 && amount <= balance && /^(bc1|tb1|[13]|m|n|2)[a-zA-HJ-NP-Z0-9]{8,87}$/.test(btcAddress.trim()),
    [authed, amount, balance, btcAddress]
  );

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    const { data, error } = await supabase.rpc("request_tart_claim", {
      _amount: amount,
      _btc_address: btcAddress.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message || "Claim failed");
      return;
    }
    toast.success(`Claim queued — ${amount} ATART reserved for inscription`);
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Claim ATART — On-chain BRC-20 inscription | Aetherion</title>
        <meta
          name="description"
          content="Convert your earned ATART tarot tokens into a real BRC-20 inscription on Bitcoin, sent to your wallet."
        />
        <link rel="canonical" href="https://www.excaliburcrypto.com/claim/tart" />
      </Helmet>

      <header className="border-b border-border/40 bg-card/40 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/tarot">
              <ArrowLeft className="h-4 w-4 mr-2" /> Tarot
            </Link>
          </Button>
          <Badge variant="outline" className="border-primary/40 text-primary">
            <Coins className="h-3 w-3 mr-1" /> ATART balance: {balance.toLocaleString()}
          </Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bitcoin className="h-7 w-7 text-amber-400" />
            Claim your ATART on Bitcoin
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Every verified tarot reading mints <strong>+1 ATART</strong> to your off-chain balance. Request a claim
            below and your tokens will be inscribed as a real BRC-20 transfer to your Bitcoin wallet.
          </p>
          <p className="mt-2 text-xs text-muted-foreground/90">
            Status flow: <strong>pending</strong> → admin inscribes on L1 → <strong>inscribed</strong> with ordinals
            link. Typical turnaround depends on mempool fees and queue depth.
          </p>
        </motion.div>

        {authed === false && (
          <Card className="border-amber-500/40">
            <CardContent className="p-6 text-sm">
              You need to be signed in to claim ATART.{" "}
              <Link to="/auth" className="text-primary underline">
                Sign in
              </Link>
            </CardContent>
          </Card>
        )}

        {authed && (
          <Card className="border-primary/30 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Inscription request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="amount" className="text-xs">
                  Amount (max {balance.toLocaleString()})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  min={1}
                  max={Math.max(1, balance)}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(1, Math.min(balance, Number(e.target.value) || 0)))}
                  disabled={loading || balance === 0}
                />
              </div>

              <div>
                <Label htmlFor="btc" className="text-xs">
                  Destination BTC address {profileBtc && profileBtc === btcAddress && (
                    <span className="text-muted-foreground"> · from profile</span>
                  )}
                </Label>
                <Input
                  id="btc"
                  placeholder="bc1q…"
                  value={btcAddress}
                  onChange={(e) => setBtcAddress(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Taproot (bc1p…) or native segwit (bc1q…) recommended for BRC-20.
                </p>
              </div>

              <Button onClick={submit} disabled={!canSubmit || submitting} className="w-full">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Reserving…
                  </>
                ) : (
                  <>Claim {amount} ATART on-chain</>
                )}
              </Button>

              {balance === 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  No ATART yet — verify a tarot reading first to mint one.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/30">
          <CardHeader>
            <CardTitle className="text-base">Recent claims</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {claims.length === 0 ? (
              <p className="text-xs text-muted-foreground">No claim requests yet.</p>
            ) : (
              claims.map((c) => (
                <Link
                  key={c.id}
                  to={`/claim/tart/${c.id}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-md border border-border/40 text-xs hover:border-primary/50 hover:bg-card/50 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong>{c.amount} ATART</strong>
                      <Badge variant="outline" className={statusTone[c.status] ?? ""}>
                        {c.status}
                      </Badge>
                    </div>
                    <div className="font-mono text-[10px] text-muted-foreground truncate">{c.btc_address}</div>
                    {c.inscription_id && (
                      <div className="text-primary font-mono text-[10px] truncate">
                        {c.inscription_id.slice(0, 24)}…
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(c.created_at).toLocaleDateString()}
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ClaimTart;
