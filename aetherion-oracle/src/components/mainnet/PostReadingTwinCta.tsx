// Post-tarot dual CTA — founder revenue + URUU lattice (equal weight)
import { Link } from "react-router-dom";
import { ArrowRight, Coins, Crown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/funnel";
import { URUU_CHAIN, URUU_TICK } from "@/lib/uruu";
import { FOUNDER_ECONOMICS, founderAuthHref } from "@/lib/founderEconomics";

export default function PostReadingTwinCta() {
  return (
    <Card className="border-border/80 bg-card/60" data-testid="post-reading-twin-cta">
      <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-amber-200">
            <Crown className="h-4 w-4" />
            <span className="font-display text-xs uppercase tracking-widest">Revenue rail</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {FOUNDER_ECONOMICS.labelFirst} first month → {FOUNDER_ECONOMICS.labelRenew}/mo. Unlimited casts + AETX eligibility.
          </p>
          <Button asChild size="sm" variant="secondary" className="gap-1">
            <Link
              to={founderAuthHref("post_reading_revenue")}
              onClick={() => void trackEvent("post_reading_signup_clicked", { via: "twin_cta_revenue" })}
            >
              Founder seat
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="space-y-2 sm:border-l sm:border-border/60 sm:pl-4">
          <div className="flex items-center gap-2 text-primary">
            <Coins className="h-4 w-4" />
            <span className="font-display text-xs uppercase tracking-widest">URUU rail</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {URUU_TICK} is live on {URUU_CHAIN}. Quote the fair lattice before you bridge.
          </p>
          <Button asChild size="sm" variant="outline" className="gap-1">
            <Link
              to="/buy/uruu"
              onClick={() => void trackEvent("buy_uruu_visit", { via: "post_reading_twin" })}
            >
              Explore URUU
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
