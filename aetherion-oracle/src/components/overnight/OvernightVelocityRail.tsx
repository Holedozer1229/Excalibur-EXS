/**
 * Overnight velocity — three money rails with UTC raid countdown.
 * Aggressive conversion; honest operator math (not a return guarantee).
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Crown, Coins, Flame, Share2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/funnel";
import { fetchFounderSeatStatus, FOUNDER_ECONOMICS } from "@/lib/founderEconomics";
import {
  FOUNDER_SEATS_CAP,
  OVERNIGHT_RAILS,
  bountySignupProjection,
  formatRaidCountdown,
  founderMrrProjection,
  secondsUntilUtcMidnight,
} from "@/lib/overnightVelocity";

const TAG_ICON = {
  revenue: Crown,
  uruu: Coins,
  viral: Share2,
} as const;

type Props = {
  className?: string;
  /** Show compact single-row variant */
  compact?: boolean;
};

export default function OvernightVelocityRail({ className = "", compact = false }: Props) {
  const [countdown, setCountdown] = useState(() => formatRaidCountdown(secondsUntilUtcMidnight()));
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setCountdown(formatRaidCountdown(secondsUntilUtcMidnight()));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      const status = await fetchFounderSeatStatus();
      if (status) setSeatsLeft(status.remaining);
    })();
  }, []);

  const seatsTonight = seatsLeft ?? 47;
  const mrrIfTen = founderMrrProjection(10);
  const mrrIfFifty = founderMrrProjection(50);
  const bountyUpside = bountySignupProjection(100);

  if (compact) {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-rose-500/5 to-violet-500/10 px-4 py-3 text-sm ${className}`}
        data-testid="overnight-velocity-compact"
      >
        <Zap className="h-4 w-4 text-amber-300" />
        <span className="font-display text-xs uppercase tracking-widest text-amber-100">
          Overnight raid
        </span>
        <Badge variant="outline" className="gap-1 font-mono text-[10px]">
          <Clock className="h-3 w-3" />
          {countdown}
        </Badge>
        <Button asChild size="sm" className="h-8 gap-1">
          <Link
            to="/overnight"
            onClick={() => void trackEvent("overnight_rail_click", { via: "compact" })}
          >
            Stack tonight
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <section
      className={`space-y-5 ${className}`}
      data-testid="overnight-velocity-rail"
      aria-labelledby="overnight-velocity-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Badge className="mb-2 gap-1 bg-amber-500/20 text-amber-100 hover:bg-amber-500/25">
            <Flame className="h-3 w-3" />
            Overnight velocity
          </Badge>
          <h2
            id="overnight-velocity-heading"
            className="font-display text-2xl uppercase tracking-widest text-foreground md:text-3xl"
          >
            Stack revenue before UTC midnight
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Three rails that can compound tonight: recurring founder MRR, zkEVM wallet flow to live
            URUU, and bounty shares that feed signups. No magic — just maximum surface area while
            the raid window is open.
          </p>
        </div>
        <div
          className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-center"
          data-testid="overnight-countdown"
        >
          <p className="text-[10px] uppercase tracking-widest text-amber-200/80">Raid ends</p>
          <p className="font-mono text-lg text-amber-100">{countdown}</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {OVERNIGHT_RAILS.map((rail) => {
          const Icon = TAG_ICON[rail.tag];
          return (
            <Card
              key={rail.id}
              className="border-border/80 bg-card/70 backdrop-blur-sm transition-colors hover:border-amber-500/40"
            >
              <CardContent className="flex h-full flex-col p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {rail.tag}
                  </Badge>
                </div>
                <h3 className="font-display text-sm uppercase tracking-widest">{rail.title}</h3>
                <p className="mt-2 flex-1 text-xs text-muted-foreground">{rail.hook}</p>
                <p className="mt-2 font-mono text-[10px] text-amber-200/90">{rail.metric}</p>
                <Button asChild size="sm" className="mt-4 w-full gap-1">
                  <Link
                    to={rail.href}
                    onClick={() =>
                      void trackEvent("overnight_rail_click", { rail: rail.id, via: "card" })
                    }
                  >
                    {rail.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-violet-500/30 bg-violet-500/5">
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              10 founders tonight
            </p>
            <p className="font-mono text-xl text-amber-200" data-testid="profit-mrr-10">
              ${mrrIfTen}/mo MRR
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              50 founders tonight
            </p>
            <p className="font-mono text-xl text-amber-200" data-testid="profit-mrr-50">
              ${mrrIfFifty}/mo MRR
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              100 bounty clicks @ 8%
            </p>
            <p className="font-mono text-xl text-amber-200" data-testid="profit-bounty">
              ~${bountyUpside}/mo illustrative
            </p>
          </div>
        </CardContent>
      </Card>

      {seatsLeft !== null && seatsLeft > 0 && (
        <p className="text-center text-xs text-amber-200/90">
          <Flame className="mr-1 inline h-3 w-3" />
          {seatsLeft} of {FOUNDER_SEATS_CAP} founder seats remain at {FOUNDER_ECONOMICS.labelFirst} first month
        </p>
      )}

      <p className="text-center text-[10px] text-muted-foreground">
        Illustrative math only — not financial advice, not a promise of overnight millions. You
        control traffic, conversion, and product-market fit.
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild size="lg" className="gap-2">
          <Link
            to="/war-chest"
            onClick={() => void trackEvent("overnight_rail_click", { via: "war_chest" })}
          >
            Open War Chest
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link to="/buy/uruu">Buy URUU path</Link>
        </Button>
      </div>
    </section>
  );
}
