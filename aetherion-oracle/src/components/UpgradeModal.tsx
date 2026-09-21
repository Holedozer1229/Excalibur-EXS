import { useState } from "react";
import { X, Check, Wallet, Loader2, CreditCard, Settings } from "lucide-react";
import { TIERS, type TierId } from "@/lib/tiers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { FounderOfferCard } from "@/components/FounderOfferCard";
import { FOUNDER_ECONOMICS } from "@/lib/founderEconomics";

// USD prices shown next to the Stripe button. Founder coupon path is $5.99 → $49.99;
// acolyte remains the non-coupon Stripe product when configured.
const FIAT_PRICES: Record<Exclude<TierId, "seeker">, { month: string; year: string }> = {
  acolyte:    { month: `${FOUNDER_ECONOMICS.labelFirst} first → ${FOUNDER_ECONOMICS.labelRenew}/mo`, year: "$479/yr" },
  oracle_pro: { month: FOUNDER_ECONOMICS.labelRenew + "/mo", year: "$479/yr" },
};

// Maps tier+interval to the human-readable Stripe lookup_key created via batch_create_product.
const PRICE_IDS: Record<Exclude<TierId, "seeker">, { month: string; year: string }> = {
  acolyte:    { month: "acolyte_monthly",    year: "acolyte_yearly" },
  oracle_pro: { month: "oracle_pro_monthly", year: "oracle_pro_yearly" },
};

type StripeMode = "test" | "live" | "unconfigured" | "unknown";


interface Props {
  current: TierId;
  walletAddress: string | null;
  onClose: () => void;
  onUpgraded: (id: TierId) => void;
}

const ACCENT: Record<string, { ring: string; text: string; glow: string }> = {
  cyan:    { ring: "border-primary/50",                          text: "text-primary", glow: "shadow-[0_0_24px_hsl(var(--neon-cyan)/0.35)]" },
  magenta: { ring: "border-accent/60",                           text: "text-magenta", glow: "shadow-[0_0_28px_hsl(var(--neon-magenta)/0.45)]" },
  violet:  { ring: "border-[hsl(var(--neon-violet)/0.6)]",       text: "text-violet",  glow: "shadow-[0_0_30px_hsl(var(--neon-violet)/0.5)]" },
};

// Native-token price per chain. Mirrors PRICES in supabase/functions/verify-payment.
const PRICES: Record<Exclude<TierId, "seeker">, Record<number, { amount: number; symbol: string }>> = {
  acolyte:    { 1: { amount: 0.003, symbol: "ETH" }, 11155111: { amount: 0.003, symbol: "ETH" }, 137: { amount: 5, symbol: "POL" }, 1101: { amount: 0.003, symbol: "ETH" }, 2442: { amount: 0.003, symbol: "ETH" } },
  oracle_pro: { 1: { amount: 0.015, symbol: "ETH" }, 11155111: { amount: 0.015, symbol: "ETH" }, 137: { amount: 25, symbol: "POL" }, 1101: { amount: 0.015, symbol: "ETH" }, 2442: { amount: 0.015, symbol: "ETH" } },
};

const CHAIN_OPTIONS = [
  { id: 11155111, label: "Sepolia (testnet)" },
  { id: 1, label: "Ethereum" },
  { id: 137, label: "Polygon" },
  { id: 1101, label: "Polygon zkEVM" },
  { id: 2442, label: "zkEVM Cardona (testnet)" },
];

const VERIFY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-payment`;

export const UpgradeModal = ({ current, walletAddress, onClose, onUpgraded }: Props) => {
  // Single Founder plan — oracle_pro tier is retired from the user-facing modal.
  const tiers = [TIERS.seeker, TIERS.acolyte];
  const [selected, setSelected] = useState<Exclude<TierId, "seeker"> | null>(null);
  const [chainId, setChainId] = useState<number>(11155111);
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState("");

  const [interval, setInterval] = useState<"month" | "year">("month");
  const [useTrial, setUseTrial] = useState(true);
  const [trialNotice, setTrialNotice] = useState<string | null>(null);
  const [stripeMode] = useState<StripeMode>(() => {
    if (!isPaymentsConfigured()) return "unconfigured";
    try { return getStripeEnvironment() === "sandbox" ? "test" : "live"; } catch { return "unknown"; }
  });
  const [referralCode, setReferralCode] = useState<string>(() => {
    try {
      const url = new URL(window.location.href);
      const fromUrl = url.searchParams.get("ref");
      if (fromUrl) { localStorage.setItem("aetherion_ref", fromUrl.toUpperCase()); return fromUrl.toUpperCase(); }
      return (localStorage.getItem("aetherion_ref") ?? "").toUpperCase();
    } catch { return ""; }
  });

  const { openCheckout, closeCheckout, checkoutElement, isOpen: checkoutOpen } = useStripeCheckout();

  const treasury = import.meta.env.VITE_TREASURY_ADDRESS as string | undefined;
  const price = selected ? PRICES[selected][chainId] : null;

  const payWithStripe = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) throw new Error("Sign in first.");
      if (referralCode.trim()) {
        try { localStorage.setItem("aetherion_ref", referralCode.trim().toUpperCase()); } catch { /* ignore */ }
      }
      setTrialNotice(null);
      // BYOK Stripe path — hosted Checkout via the stripe-checkout edge function.
      // Returns { url, trial_applied } where trial_applied=false means the user
      // was ineligible (already had a subscription on this Stripe customer).
      const { data, error } = await supabase.functions.invoke("stripe-checkout", {
        body: {
          tier: selected,
          interval,
          trial: useTrial,
          referral_code: referralCode.trim() || undefined,
          success_url: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}&tier=${selected}`,
          cancel_url: `${window.location.origin}${window.location.pathname}?upgrade=cancelled`,
        },
      });
      if (error || !data?.url) {
        throw new Error(error?.message || data?.error || "Could not start checkout.");
      }
      if (useTrial && data.trial_applied === false) {
        setUseTrial(false);
        const msg = "Free trial isn't available — our records show you've subscribed before. You'll be charged immediately at the standard price.";
        setTrialNotice(msg);
        toast.info("Free trial not available", { description: msg });
      }
      window.location.assign(data.url as string);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  };

  const openBillingPortal = async () => {
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sign in first.");
      const { data, error } = await supabase.functions.invoke("create-portal-session", {
        body: {
          returnUrl: `${window.location.origin}${window.location.pathname}`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) throw new Error(error?.message || data?.error || "Failed to open portal");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal.");
    } finally {
      setBusy(false);
    }
  };


  const payWithWallet = async () => {
    if (!selected || !price) return;
    if (!walletAddress) {
      toast.error("Bind a wallet address in your profile first.");
      return;
    }
    if (!treasury) {
      toast.error("Treasury wallet not configured. Use 'I already paid' to submit a tx hash manually.");
      return;
    }
    // deno-lint-ignore no-explicit-any
    const eth = (window as any).ethereum;
    if (!eth) {
      toast.error("No wallet detected. Install MetaMask or use 'I already paid'.");
      return;
    }
    setBusy(true);
    try {
      const accounts = await eth.request({ method: "eth_requestAccounts" }) as string[];
      const from = accounts[0]?.toLowerCase();
      if (from !== walletAddress.toLowerCase()) {
        throw new Error(`Active wallet (${from}) doesn't match your bound wallet (${walletAddress}).`);
      }
      // Switch chain
      const hexChain = "0x" + chainId.toString(16);
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexChain }] });
      } catch (_) { /* user may already be on it */ }

      const valueWei = "0x" + BigInt(Math.floor(price.amount * 1e18)).toString(16);
      const hash = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from, to: treasury, value: valueWei }],
      }) as string;
      toast.message("Transaction sent — verifying on-chain…", { description: hash });
      await verify(hash);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Wallet payment failed.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (hash: string) => {
    if (!selected) return;
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sign in first.");
      // Poll up to ~90s for the tx to appear in the node's view.
      let lastErr = "";
      for (let i = 0; i < 18; i++) {
        const r = await fetch(VERIFY_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ chainId, txHash: hash, tier: selected }),
        });
        const j = await r.json().catch(() => ({}));
        if (r.ok) {
          toast.success(`Welcome to ${TIERS[selected].name} — until ${new Date(j.period_end).toLocaleDateString()}.`);
          onUpgraded(selected);
          onClose();
          return;
        }
        lastErr = j?.error ?? `HTTP ${r.status}`;
        if (j?.code === "DUPLICATE" || !/not found|not yet mined/i.test(lastErr)) break;
        await new Promise((res) => setTimeout(res, 5000));
      }
      throw new Error(lastErr || "Verification failed.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto border-rune rounded-sm bg-card/60 backdrop-blur-xl shadow-deep"
        onClick={(e) => e.stopPropagation()}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center text-[24rem] font-display text-foreground/[0.03] select-none">䷀</div>

        <div className="relative flex items-center justify-between px-6 py-4 border-b border-rune bg-void/40">
          <div>
            <h2 className="font-display uppercase tracking-[0.32em] text-sm gradient-neon-text">
              {checkoutOpen ? "Complete Payment" : "Fastest real cash · Founder seat"}
            </h2>
            <p className="text-[11px] text-muted-foreground italic mt-0.5">
              {checkoutOpen
                ? "Secure embedded checkout."
                : `${FOUNDER_ECONOMICS.labelFirst} first month → ${FOUNDER_ECONOMICS.labelRenew}/mo · first ${FOUNDER_ECONOMICS.seatCap} only.`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {current !== "seeker" && !checkoutOpen && (
              <button
                onClick={openBillingPortal}
                disabled={busy}
                className="px-3 py-1.5 text-[10px] font-display uppercase tracking-widest border border-primary/50 text-primary hover:bg-primary/10 rounded-sm flex items-center gap-1.5 disabled:opacity-50"
                title="Upgrade, downgrade, or cancel"
              >
                <Settings className="w-3 h-3" /> Manage
              </button>
            )}
            <button
              onClick={checkoutOpen ? closeCheckout : onClose}
              className="p-1 hover:text-magenta transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {checkoutOpen && (
          <div className="relative p-5 bg-background/80 min-h-[500px] space-y-3">
            {trialNotice && (
              <div className="text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/40 rounded-sm px-3 py-2">
                <div className="font-display uppercase tracking-widest text-[10px] text-amber-400 mb-0.5">Free trial not available</div>
                {trialNotice}
              </div>
            )}
            {checkoutElement}
          </div>
        )}

        {!checkoutOpen && (
        <>

        <FounderOfferCard currentTier={current} />

        <div className="relative grid md:grid-cols-3 gap-4 p-5">
          {tiers.map((t) => {
            const a = ACCENT[t.accent];
            const isCurrent = t.id === current;
            const isSelected = selected === t.id;
            return (
              <div key={t.id} className={`relative flex flex-col rounded-sm border ${a.ring} bg-card/70 backdrop-blur-sm p-5 ${a.glow} ${isSelected ? "ring-2 ring-accent" : ""} transition-transform hover:-translate-y-0.5`}>
                {isCurrent && <span className="absolute -top-2 right-3 px-2 py-0.5 text-[9px] font-display uppercase tracking-widest border border-border bg-background text-muted-foreground rounded-sm">Current</span>}
                <div className={`font-display uppercase tracking-[0.25em] text-xs ${a.text}`}>{t.name}</div>
                <div className="mt-2 font-display text-2xl text-foreground">{t.price}</div>
                <div className="mt-1 text-[11px] font-mono text-muted-foreground uppercase tracking-wider">{t.monthlyLimit.toLocaleString()} responses / month</div>

                <ul className="mt-4 space-y-2 text-sm text-foreground/90 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${a.text}`} />
                      <span className="font-serif leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  disabled={isCurrent || busy}
                  onClick={() => t.id === "seeker" ? null : setSelected(t.id as Exclude<TierId, "seeker">)}
                  className={`mt-5 w-full px-4 py-2 rounded-sm font-display uppercase tracking-widest text-xs transition-all border
                    ${isCurrent
                      ? "border-border bg-secondary/40 text-muted-foreground cursor-not-allowed"
                      : t.accent === "violet" ? "border-[hsl(var(--neon-violet)/0.6)] bg-[hsl(var(--neon-violet)/0.15)] text-violet hover:bg-[hsl(var(--neon-violet)/0.3)]"
                      : t.accent === "magenta" ? "border-accent/60 bg-accent/15 text-magenta hover:bg-accent/30"
                      : "border-primary/60 bg-primary/15 text-primary hover:bg-primary/30"}`}
                >
                  {isCurrent ? "Active" : t.id === "seeker" ? "Free" : `Select ${t.name}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Stripe (fiat) payment panel */}
        {selected && (
          <div className="relative mx-5 mt-1 mb-3 p-5 border border-rune rounded-sm bg-void/60 space-y-4">
            <div className="flex items-center justify-between gap-2 text-xs font-display uppercase tracking-[0.25em] text-primary">
              <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" /> Pay with card — {TIERS[selected].name}</span>
              {stripeMode === "test" && (
                <span className="px-2 py-0.5 rounded-sm border border-amber-500/60 bg-amber-500/15 text-amber-400 font-mono text-[9px] tracking-widest">TEST MODE</span>
              )}
              {stripeMode === "live" && (
                <span className="px-2 py-0.5 rounded-sm border border-emerald-500/60 bg-emerald-500/15 text-emerald-400 font-mono text-[9px] tracking-widest">LIVE</span>
              )}
              {stripeMode === "unconfigured" && (
                <span className="px-2 py-0.5 rounded-sm border border-destructive/60 bg-destructive/15 text-destructive font-mono text-[9px] tracking-widest">NOT CONFIGURED</span>
              )}
            </div>
            <div className="flex gap-2">
              {(["month", "year"] as const).map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval(iv)}
                  className={`flex-1 px-3 py-2 rounded-sm border text-xs font-display uppercase tracking-widest transition-colors ${
                    interval === iv
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  {iv === "month" ? "Monthly" : "Yearly · save 17%"}
                  <div className="font-mono text-[10px] text-muted-foreground mt-0.5 normal-case tracking-normal">
                    {FIAT_PRICES[selected][iv]}
                  </div>
                </button>
              ))}
            </div>
            <label className="block">
              <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Referral code (optional)</span>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12))}
                placeholder="ABCD1234"
                className="w-full px-3 py-2 bg-background border border-border rounded-sm font-mono text-sm tracking-widest"
                spellCheck={false}
                autoComplete="off"
              />
            </label>
            <label className="flex items-start gap-3 px-3 py-2.5 rounded-sm border border-primary/40 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors">
              <input
                type="checkbox"
                checked={useTrial}
                onChange={(e) => setUseTrial(e.target.checked)}
                className="mt-0.5 accent-[hsl(var(--primary))]"
              />
              <span className="flex-1">
                <span className="block text-xs font-display uppercase tracking-widest text-primary">Start with 14-day free trial</span>
                <span className="block text-[10px] font-mono text-muted-foreground mt-0.5 normal-case">
                  No charge for 14 days. Cancel anytime before then and you won't be billed. New subscribers only.
                </span>
              </span>
            </label>
            <button
              disabled={busy}
              onClick={payWithStripe}
              className="w-full px-4 py-2 rounded-sm font-display uppercase tracking-widest text-xs border border-primary/60 bg-primary/15 text-primary hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
              {useTrial
                ? `Start 14-day free trial — then ${FIAT_PRICES[selected][interval]}`
                : `Continue to Stripe — ${FIAT_PRICES[selected][interval]}`}
            </button>
            <p className="text-[10px] font-mono text-muted-foreground text-center">
              {useTrial
                ? "Card required. First charge on day 15 unless canceled. Auto-renews."
                : "Secure checkout via Stripe · cancel anytime · auto-renews"}
            </p>
            {stripeMode === "test" && (
              <div className="text-[10px] font-mono text-amber-400/80 bg-amber-500/5 border border-amber-500/30 rounded-sm px-3 py-2 space-y-0.5">
                <div className="font-display uppercase tracking-widest text-[9px] text-amber-400">▌ Test mode active ▐</div>
                <div>Card: <span className="text-amber-300">4242 4242 4242 4242</span></div>
                <div>Any future expiry · any CVC · any ZIP — no real charge.</div>
              </div>
            )}
            {stripeMode === "unconfigured" && (
              <div className="text-[10px] font-mono text-destructive bg-destructive/10 border border-destructive/40 rounded-sm px-3 py-2">
                Stripe keys aren't set on the backend. Add STRIPE_SECRET_KEY (sk_test_… or sk_live_…) to enable.
              </div>
            )}
          </div>
        )}

        {/* Crypto payment panel */}
        {selected && (
          <div className="relative mx-5 mb-5 p-5 border border-rune rounded-sm bg-void/60 space-y-4">
            <div className="flex items-center gap-2 text-xs font-display uppercase tracking-[0.25em] text-magenta">
              <Wallet className="w-4 h-4" /> Or pay with wallet — {TIERS[selected].name}
            </div>

            {!walletAddress && (
              <p className="text-xs text-destructive font-mono">⚠ Bind your wallet address in profile settings before paying.</p>
            )}
            {!treasury && (
              <p className="text-xs text-amber-500 font-mono">⚠ No treasury wallet configured. Set VITE_TREASURY_ADDRESS to enable in-app payments.</p>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Network</span>
                <select
                  value={chainId} onChange={(e) => setChainId(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-sm px-3 py-2 text-sm font-mono"
                >
                  {CHAIN_OPTIONS.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <div>
                <span className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Amount</span>
                <div className="px-3 py-2 border border-border rounded-sm font-mono text-sm bg-background">
                  {price ? `${price.amount} ${price.symbol}` : "—"}
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-muted-foreground break-all">
              <div>From: {walletAddress ?? "(no wallet bound)"}</div>
              <div>To:&nbsp;&nbsp; {treasury ?? "(treasury not set)"}</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                disabled={busy || !walletAddress || !treasury}
                onClick={payWithWallet}
                className="flex-1 px-4 py-2 rounded-sm font-display uppercase tracking-widest text-xs border border-accent/60 bg-accent/20 text-magenta hover:bg-accent/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wallet className="w-3 h-3" />}
                Pay {price ? `${price.amount} ${price.symbol}` : ""}
              </button>
            </div>

            {/* Manual fallback */}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-mono uppercase tracking-widest text-[10px]">I already paid — submit tx hash</summary>
              <div className="mt-2 flex gap-2">
                <input
                  value={txHash} onChange={(e) => setTxHash(e.target.value.trim())}
                  placeholder="0x…"
                  className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-mono text-xs"
                />
                <button
                  disabled={busy || !/^0x[a-fA-F0-9]{64}$/.test(txHash)}
                  onClick={() => verify(txHash.toLowerCase())}
                  className="px-3 py-2 border border-border rounded-sm font-display uppercase tracking-widest text-[10px] hover:text-magenta disabled:opacity-50"
                >
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "Verify"}
                </button>
              </div>
            </details>
          </div>
        )}

        <div className="relative px-6 pb-5 -mt-1">
          <p className="text-[11px] text-muted-foreground/80 italic text-center font-serif">
            Subscriptions auto-renew. Cancel anytime via Manage — access continues until period end. Plan changes are pro-rated immediately.
          </p>
        </div>
        </>
        )}
      </div>
    </div>
  );
};
