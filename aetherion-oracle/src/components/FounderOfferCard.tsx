import { useEffect, useState } from "react";
import { Flame, Loader2, Sparkles, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { trackEvent } from "@/lib/funnel";
import { FOUNDER_ECONOMICS } from "@/lib/founderEconomics";

interface Status {
  remaining: number;
  max: number;
  sold_out: boolean;
  price_cents: number;
  full_price_cents: number;
}

interface Props {
  /** Hide entirely when the user is already on oracle_pro. */
  currentTier: string;
}

export const FounderOfferCard = ({ currentTier }: Props) => {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);

  useEffect(() => {
    if (currentTier === "oracle_pro") { setLoading(false); return; }
    let alive = true;
    (async () => {
      try {
        const env = isPaymentsConfigured() ? getStripeEnvironment() : "sandbox";
        const { data, error } = await supabase.functions.invoke(
          `founder-offer?environment=${env}`,
          { method: "GET" } as any,
        );
        if (error) throw error;
        if (alive) setStatus(data as Status);
      } catch (e) {
        console.error("founder-offer status failed", e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [currentTier]);

  if (currentTier === "oracle_pro") return null;
  if (loading) return null;
  if (!status) return null;

  const percent = Math.round(((status.max - status.remaining) / status.max) * 100);
  const firstLabel = FOUNDER_ECONOMICS.labelFirst;
  const renewLabel = FOUNDER_ECONOMICS.labelRenew;
  const seatCap = FOUNDER_ECONOMICS.seatCap;

  const startCheckout = async () => {
    if (!isPaymentsConfigured()) {
      toast.error("Payments aren't configured yet.");
      return;
    }
    void trackEvent("founder_checkout_started", {
      price_cents: status?.price_cents ?? FOUNDER_ECONOMICS.firstMonthCents,
    });
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session?.user) throw new Error("Sign in first.");
      const env = getStripeEnvironment();
      const { data, error } = await supabase.functions.invoke("founder-offer", {
        body: {
          environment: env,
          returnUrl: `${window.location.origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
        },
      });
      if (error || !data?.clientSecret) {
        throw new Error(error?.message || data?.error || "Could not start checkout.");
      }
      setCheckoutSecret(data.clientSecret);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setBusy(false);
    }
  };

  if (checkoutSecret) {
    return (
      <div className="mx-5 mt-5 border-2 border-accent/70 rounded-sm bg-void/80 p-4 shadow-[0_0_40px_hsl(var(--neon-magenta)/0.45)]">
        <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret: async () => checkoutSecret }}>
          <EmbeddedCheckout />
        </EmbeddedCheckoutProvider>
      </div>
    );
  }

  if (status.sold_out) {
    return (
      <div className="mx-5 mt-5 border border-border rounded-sm bg-void/60 p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Flame className="w-5 h-5 text-muted-foreground" />
          <div>
            <div className="font-display uppercase tracking-[0.25em] text-[11px] text-muted-foreground">
              Founders {seatCap} — Sold Out
            </div>
            <div className="text-[11px] font-mono text-muted-foreground/70">
              {seatCap} / {seatCap} claimed · thank you, founders
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-sm border border-border bg-background text-muted-foreground font-mono text-[10px] tracking-widest">
          CLOSED
        </span>
      </div>
    );
  }

  return (
    <div className="mx-5 mt-5 border-2 border-accent/70 rounded-sm bg-gradient-to-br from-accent/10 via-void/80 to-[hsl(var(--neon-violet)/0.15)] p-5 shadow-[0_0_36px_hsl(var(--neon-magenta)/0.35)] animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-magenta animate-pulse" />
          <span className="font-display uppercase tracking-[0.32em] text-[11px] text-magenta">
            Founders {seatCap} · Fastest real cash
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-sm border border-accent/60 bg-accent/15 text-magenta font-mono text-[10px] tracking-widest">
          {status.remaining} / {status.max} LEFT
        </span>
      </div>

      <div className="flex items-baseline gap-3 mb-2">
        <span className="font-display text-3xl text-foreground">{firstLabel}</span>
        <span className="font-mono text-xs text-muted-foreground">first month</span>
        <span className="font-mono text-[11px] line-through text-muted-foreground/70 ml-auto">
          {renewLabel}/mo
        </span>
      </div>
      <p className="text-[12px] font-serif text-foreground/80 leading-snug mb-3">
        Full <span className="text-magenta">Oracle Pro</span> access — unlimited tarot, dreams,
        petitions, and the Caduceus voice. After month one, renews at{" "}
        <span className="text-foreground">{renewLabel}/mo</span>. Stripe only — not L1 ETH, not BTC. Cancel anytime.
      </p>

      <div className="h-1.5 rounded-full bg-background/60 overflow-hidden mb-3">
        <div
          className="h-full bg-gradient-to-r from-accent to-[hsl(var(--neon-violet))] transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>

      <button
        disabled={busy}
        onClick={startCheckout}
        className="w-full px-4 py-2.5 rounded-sm font-display uppercase tracking-widest text-xs border border-accent/70 bg-accent/20 text-magenta hover:bg-accent/35 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3" />}
        Claim founder seat — {firstLabel}
      </button>
    </div>
  );
};
