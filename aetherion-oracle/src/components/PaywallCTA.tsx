// Reusable paywall CTA. Hidden for users who already have an active
// subscription. Clicking deep-links to "/?open=founder" which Index
// auto-opens the UpgradeModal (FounderOfferCard) on mount.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Lock, Crown, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { FOUNDER_ECONOMICS } from "@/lib/founderEconomics";

type Variant = "banner" | "card" | "inline" | "locked-feature";

interface Props {
  variant?: Variant;
  /** Optional feature name the user is being upsold on. */
  feature?: string;
  /** Optional contextual headline override. */
  headline?: string;
  /** Optional contextual subline override. */
  subline?: string;
  /** Tier the CTA is selling. Defaults to oracle_pro. */
  tier?: "acolyte" | "oracle_pro";
  /** Stripe billing interval the deep-link should preselect. */
  interval?: "month" | "year";
  /** UTM-style source identifier for analytics. */
  source?: string;
  className?: string;
}

const TIER_LABEL = {
  acolyte: "Founder",
  oracle_pro: "Oracle Pro",
};

const TIER_BULLETS: Record<"acolyte" | "oracle_pro", string[]> = {
  acolyte: [
    "Unlimited oracle responses",
    "Full tarot, dreams & Caduceus",
    `${FOUNDER_ECONOMICS.labelFirst} first month → ${FOUNDER_ECONOMICS.labelRenew}/mo`,
  ],
  oracle_pro: [
    "10,000 oracle responses / month",
    "Pro Vision (FLUX.2 Pro) dream images",
    "Shareable dreams + priority mining",
    "BRC-20 Lattice Bridge access",
  ],
};

const TIER_PRICE: Record<"acolyte" | "oracle_pro", string> = {
  acolyte: `${FOUNDER_ECONOMICS.labelFirst} first → ${FOUNDER_ECONOMICS.labelRenew}/mo`,
  oracle_pro: `${FOUNDER_ECONOMICS.labelRenew} / mo`,
};

const PaywallCTA = ({
  variant = "banner",
  feature,
  headline,
  subline,
  tier = "oracle_pro",
  interval = "month",
  source = "paywall",
  className = "",
}: Props) => {
  const [hidden, setHidden] = useState(true); // start hidden, reveal after auth check
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setHidden(false);
        setChecked(true);
        return;
      }
      const { data: sub } = await supabase
        .from("subscribers")
        .select("subscribed, subscription_tier")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      // Hide for Pro users; show for Acolyte if we're selling Pro upsell.
      const subscribed = !!sub?.subscribed;
      const currentTier = sub?.subscription_tier;
      const hideForSubscriber =
        subscribed &&
        (currentTier === "oracle_pro" ||
          (currentTier === "acolyte" && tier === "acolyte"));
      setHidden(hideForSubscriber);
      setChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [tier]);

  if (!checked || hidden) return null;

  const href = `/?open=founder&tier=${tier}&interval=${interval}&src=${encodeURIComponent(source)}`;
  const label = TIER_LABEL[tier];
  const price = TIER_PRICE[tier];

  if (variant === "inline") {
    return (
      <Link
        to={href}
        className={`inline-flex items-center gap-1.5 text-xs underline text-primary hover:opacity-80 ${className}`}
      >
        <Crown className="h-3 w-3" />
        {headline ?? `Upgrade to ${label}`}
      </Link>
    );
  }

  if (variant === "locked-feature") {
    return (
      <div
        className={`rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 text-center ${className}`}
      >
        <Lock className="h-4 w-4 mx-auto mb-1.5 text-primary" />
        <p className="text-sm font-medium mb-1">
          {headline ?? `${feature ?? "This feature"} is part of ${label}`}
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {subline ?? `Upgrade to unlock — ${price}.`}
        </p>
        <Button asChild size="sm" className="gap-1.5">
          <Link to={href}>
            <Crown className="h-3.5 w-3.5" />
            Unlock {label}
          </Link>
        </Button>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className={`border-primary/40 bg-gradient-to-b from-primary/10 to-transparent ${className}`}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Badge variant="outline" className="border-primary/50 text-primary uppercase tracking-widest text-[10px]">
              <Crown className="h-3 w-3 mr-1" /> {label}
            </Badge>
            <span className="text-sm font-semibold tabular-nums">{price}</span>
          </div>
          <h3 className="font-serif text-xl mb-2">
            {headline ?? `Cast deeper with ${label}`}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {subline ?? "Lift the daily limits, unlock Pro Vision images, and seal every reading on-chain."}
          </p>
          <ul className="space-y-1.5 mb-5">
            {TIER_BULLETS[tier].map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          <Button asChild className="w-full gap-2">
            <Link to={href}>
              <Sparkles className="h-4 w-4" />
              Upgrade to {label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // banner (default)
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <Crown className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">
            {headline ?? `Try ${label} free for 14 days`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subline ?? (feature
              ? `${feature} and more, included with ${label}. No charge for 14 days.`
              : `Then ${price}. Cancel anytime. Lift quotas, Pro Vision images, on-chain receipts.`)}
          </p>
        </div>
      </div>
      <Button asChild size="sm" className="gap-1.5 shrink-0">
        <Link to={href}>
          Start free trial
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Button>
    </div>
  );
};

export default PaywallCTA;
