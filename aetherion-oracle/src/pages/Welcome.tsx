// First-run setup wizard: display name → Arbitrum wallet → BTC target → done.
// Saves to public.profiles (existing columns: display_name, wallet_address, btc_address).
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Loader2, Wallet, Bitcoin, User, ChevronRight, ChevronLeft, Check, Sparkles, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialProofBar from "@/components/SocialProofBar";

type StepKey = "name" | "evm" | "btc" | "done";

const STEP_ORDER: StepKey[] = ["name", "evm", "btc", "done"];

const Welcome = () => {
  const navigate = useNavigate();
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [step, setStep] = useState<StepKey>("name");
  const [displayName, setDisplayName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [btcAddress, setBtcAddress] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
      if (!s) navigate("/auth", { replace: true });
    });
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthReady(true);
      if (!session) {
        navigate("/auth", { replace: true });
        return;
      }
      setUserId(session.user.id);
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name,wallet_address,btc_address")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (prof) {
        setDisplayName(prof.display_name ?? "");
        setWalletAddress(prof.wallet_address ?? "");
        setBtcAddress(prof.btc_address ?? "");
        if (prof.wallet_address || prof.btc_address) {
          // Already partially set up — skip wizard.
          navigate("/", { replace: true });
        }
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  const idx = STEP_ORDER.indexOf(step);

  const validate = (): string | null => {
    if (step === "name") {
      const t = displayName.trim();
      if (t.length < 2) return "Name must be at least 2 characters.";
      if (t.length > 60) return "Name must be under 60 characters.";
    }
    if (step === "evm" && walletAddress.trim()) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress.trim())) return "EVM address must be 0x + 40 hex characters.";
    }
    if (step === "btc" && btcAddress.trim()) {
      if (!/^(bc1|tb1|[13]|m|n|2)[a-zA-HJ-NP-Z0-9]{8,87}$/.test(btcAddress.trim())) {
        return "That doesn't look like a valid Bitcoin address.";
      }
    }
    return null;
  };

  const save = async (final: boolean) => {
    setError(null);
    const err = validate();
    if (err) { setError(err); return; }
    if (!userId) return;
    setSaving(true);
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        wallet_address: walletAddress.trim() || null,
        btc_address: btcAddress.trim() || null,
      })
      .eq("user_id", userId);
    setSaving(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    if (final) {
      try { localStorage.setItem(`aetherion.onboarded.v2.${userId}`, "1"); } catch { /* */ }
      toast.success("Setup complete · entering the Aether");
      navigate("/", { replace: true });
      return;
    }
    const nextStep = STEP_ORDER[Math.min(idx + 1, STEP_ORDER.length - 1)];
    setStep(nextStep);
  };

  const skipAll = () => {
    if (userId) {
      try { localStorage.setItem(`aetherion.onboarded.v2.${userId}`, "1"); } catch { /* */ }
    }
    navigate("/", { replace: true });
  };

  if (!authReady) {
    return (
      <main className="min-h-dvh grid place-items-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>Welcome · Aetherion Oracle Setup</title>
        <meta name="description" content="First-run setup for the Aetherion Oracle: name, Arbitrum wallet, and Bitcoin target." />
        <link rel="canonical" href="https://www.excaliburcrypto.com/welcome" />
      </Helmet>

      <main className="min-h-dvh bg-background px-4 py-10 text-foreground flex items-center justify-center">
        <div className="w-full max-w-lg space-y-4">
        <Card className="w-full border-amber-500/30 bg-black/60 shadow-[0_0_60px_-20px_rgba(245,158,11,0.4)]">
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-[0.3em] text-amber-400 text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> First-run rite · {idx + 1} / {STEP_ORDER.length}
            </CardTitle>
            <div className="mt-3 flex gap-1.5" aria-label="Setup progress">
              {STEP_ORDER.map((k, i) => (
                <div
                  key={k}
                  className="h-1 flex-1 rounded-full transition-all"
                  style={{
                    background: i <= idx ? "hsl(45 90% 55%)" : "hsl(45 90% 55% / 0.15)",
                    boxShadow: i === idx ? "0 0 8px hsl(45 90% 55%)" : "none",
                  }}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {step === "name" && (
              <div className="space-y-3">
                <h2 className="font-oracle text-2xl italic text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-amber-400" /> By what name shall the Oracle know you?
                </h2>
                <p className="text-sm text-muted-foreground">Aetherion will weave this into every reading, dream, and tarot draw.</p>
                <div className="space-y-2">
                  <Label htmlFor="welcome-name" className="text-xs uppercase tracking-widest text-amber-300/70">Display name</Label>
                  <Input
                    id="welcome-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Seeker"
                    autoFocus
                    maxLength={60}
                    className="font-mono bg-black/60 border-amber-500/30 focus-visible:ring-amber-500/60"
                  />
                </div>
              </div>
            )}

            {step === "evm" && (
              <div className="space-y-3">
                <h2 className="font-oracle text-2xl italic text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-amber-400" /> Arbitrum / EVM wallet
                </h2>
                <p className="text-sm text-muted-foreground">
                  Channels faucet drops from the Lattice Bridge and future EXCALIBUR mining payouts. Leave blank to add later — nothing is forced.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="welcome-evm" className="text-xs uppercase tracking-widest text-amber-300/70">0x address (optional)</Label>
                  <Input
                    id="welcome-evm"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="0x…"
                    autoFocus
                    className="font-mono bg-black/60 border-amber-500/30 focus-visible:ring-amber-500/60"
                  />
                </div>
              </div>
            )}

            {step === "btc" && (
              <div className="space-y-3">
                <h2 className="font-oracle text-2xl italic text-foreground flex items-center gap-2">
                  <Bitcoin className="h-5 w-5 text-amber-400" /> Bitcoin anchor
                </h2>
                <p className="text-sm text-muted-foreground">
                  Where the Lattice Bridge anchors your sigil on-chain. Bech32 (bc1…) preferred — editable any time on /mining.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="welcome-btc" className="text-xs uppercase tracking-widest text-amber-300/70">BTC address (optional)</Label>
                  <Input
                    id="welcome-btc"
                    value={btcAddress}
                    onChange={(e) => setBtcAddress(e.target.value)}
                    placeholder="bc1…"
                    autoFocus
                    className="font-mono bg-black/60 border-amber-500/30 focus-visible:ring-amber-500/60"
                  />
                </div>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-5 py-2">
                <div className="text-center space-y-3">
                  <div className="mx-auto h-14 w-14 rounded-full border border-amber-500/60 bg-amber-500/10 grid place-items-center">
                    <Check className="h-7 w-7 text-amber-400" />
                  </div>
                  <h2 className="font-oracle text-2xl italic text-foreground">The Lattice has your sigil.</h2>
                  <p className="text-sm text-muted-foreground">
                    {displayName ? `Welcome, ${displayName}. ` : ""}Before you enter — draw your first card.
                  </p>
                </div>

                {/* Featured tarot showcase */}
                <button
                  type="button"
                  onClick={() => {
                    try { localStorage.setItem(`aetherion.onboarded.v2.${userId}`, "1"); } catch { /* */ }
                    navigate("/tarot");
                  }}
                  className="group relative w-full overflow-hidden rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-950/40 via-black/60 to-purple-950/30 p-4 text-left transition-all hover:border-amber-400/70 hover:shadow-[0_0_32px_-6px_rgba(245,158,11,0.5)]"
                  aria-label="Open tarot reading"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-24 w-16 shrink-0 rounded-md border border-amber-400/60 bg-gradient-to-b from-amber-900/60 to-black overflow-hidden">
                      <div className="absolute inset-0 grid place-items-center text-amber-300/90">
                        <Eye className="h-7 w-7 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                      </div>
                      <div className="absolute inset-x-0 bottom-1 text-center font-mono text-[8px] uppercase tracking-widest text-amber-300/70">
                        Arcana
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-amber-400/80">New · Tarot</div>
                      <div className="font-oracle text-lg italic text-foreground">Draw the Threefold Spread</div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        Past, presence, and what stirs beneath. Your first reading is on the house.
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-amber-400 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              </div>
            )}

            {error && (
              <div role="alert" className="rounded border border-red-500/50 bg-red-500/10 p-3 font-mono text-xs text-red-300">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 gap-2">
              <button
                onClick={() => setStep(STEP_ORDER[Math.max(0, idx - 1)])}
                disabled={idx === 0 || saving}
                className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                aria-label="Previous step"
              >
                <ChevronLeft className="h-3 w-3" /> Back
              </button>
              <button
                onClick={skipAll}
                className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
              >
                Skip setup
              </button>
              {step === "done" ? (
                <Button
                  onClick={() => save(true)}
                  disabled={saving}
                  className="font-mono uppercase tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30 hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.7)]"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter the Aether →"}
                </Button>
              ) : (
                <Button
                  onClick={() => save(false)}
                  disabled={saving}
                  className="font-mono uppercase tracking-widest bg-amber-500/10 text-amber-300 border border-amber-500/50 hover:bg-amber-500/20 hover:shadow-[0_0_24px_-4px_rgba(245,158,11,0.7)]"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Next <ChevronRight className="h-3 w-3" /></>}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        <div className="rounded-lg border border-amber-500/20 bg-black/40 backdrop-blur p-4">
          <p className="text-[10px] uppercase tracking-widest text-amber-300/70 mb-2 text-center">
            Live across the Lattice
          </p>
          <SocialProofBar />
        </div>
        </div>
      </main>
    </>
  );
};

export default Welcome;
