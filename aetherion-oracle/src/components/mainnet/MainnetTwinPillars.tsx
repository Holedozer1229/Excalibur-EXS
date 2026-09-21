/**
 * Mainnet twin pillars — Revenue (founder / Stripe) and URUU (zkSync Era) weighted equally.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Coins, Crown, ExternalLink, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/funnel";
import {
  FOUNDER_ECONOMICS,
  founderAuthHref,
  fetchFounderSeatStatus,
} from "@/lib/founderEconomics";
import {
  URUU_BLOCKSCOUT_API,
  URUU_CHAIN,
  URUU_EXPLORER,
  URUU_FALLBACK_META,
  URUU_TICK,
  parseUruuTokenMeta,
  uruuShort,
} from "@/lib/uruu";
import { MAX_PROTOCOL_FEE_PERCENT } from "@/lib/fairLattice";

const FOUNDER_SEATS = FOUNDER_ECONOMICS.seatCap;

type Props = {
  className?: string;
  /** Hide founder pillar when user is already oracle_pro */
  hideFounderIfSubscribed?: boolean;
  subscribed?: boolean;
};

export default function MainnetTwinPillars({
  className = "",
  hideFounderIfSubscribed = false,
  subscribed = false,
}: Props) {
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [holders, setHolders] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [seatStatus, res] = await Promise.all([
          fetchFounderSeatStatus(),
          fetch(URUU_BLOCKSCOUT_API).catch(() => null),
        ]);
        if (seatStatus) setSeatsLeft(seatStatus.remaining);
        if (res?.ok) {
          const json = await res.json();
          setHolders(parseUruuTokenMeta(json).holdersCount);
        } else {
          setHolders(URUU_FALLBACK_META.holdersCount);
        }
      } catch {
        setHolders(URUU_FALLBACK_META.holdersCount);
      }
    })();
  }, []);

  const showFounder = !(hideFounderIfSubscribed && subscribed);

  return (
    <section
      className={`grid gap-4 md:grid-cols-2 ${className}`}
      aria-label="Mainnet pillars: Revenue and URUU"
      data-testid="mainnet-twin-pillars"
    >
      {showFounder && (
        <Card className="border-violet-500/40 bg-gradient-to-br from-violet-600/15 via-card/80 to-fuchsia-600/5">
          <CardContent className="flex h-full flex-col p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-violet-300" />
                <h2 className="font-display text-sm uppercase tracking-widest text-violet-100">
                  Revenue · Founder
                </h2>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                Stripe live
              </Badge>
            </div>
            <p className="mb-4 flex-1 text-sm text-muted-foreground">
              {FOUNDER_ECONOMICS.labelFirst} first month (then {FOUNDER_ECONOMICS.labelRenew}/mo). Unlimited sealed readings, AETX airdrop
              eligibility, Oracle Pro — only real $0-capital cash rail.
            </p>
            {seatsLeft !== null && seatsLeft > 0 && (
              <p className="mb-3 flex items-center gap-1.5 text-xs text-violet-200/90">
                <Flame className="h-3 w-3" />
                {seatsLeft} of {FOUNDER_SEATS} seats left
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="gap-1">
                <Link
                  to={founderAuthHref("mainnet_revenue")}
                  onClick={() => void trackEvent("founder_strip_click", { via: "twin_pillar_revenue" })}
                >
                  Claim founder seat
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/war-chest">War Chest</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card
        className={`border-primary/40 bg-gradient-to-br from-primary/10 via-card/80 to-violet-500/5 ${
          !showFounder ? "md:col-span-2" : ""
        }`}
      >
        <CardContent className="flex h-full flex-col p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-primary" />
              <h2 className="font-display text-sm uppercase tracking-widest text-primary">
                URUU · {URUU_CHAIN}
              </h2>
            </div>
            <Badge variant="secondary" className="text-[9px] uppercase tracking-widest">
              Mainnet live
            </Badge>
          </div>
          <p className="mb-2 text-sm text-muted-foreground">
            Live ERC-20 at {uruuShort}. Fair lattice quotes at {MAX_PROTOCOL_FEE_PERCENT}% max fee —
            lattice liquidity rail #1 (equal priority to founder revenue).
          </p>
          {holders !== null && (
            <p className="mb-4 text-xs font-mono text-foreground/80">
              {holders.toLocaleString()} on-chain holders · verify on Blockscout
            </p>
          )}
          <div className="mt-auto flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-1">
              <Link
                to="/buy/uruu"
                onClick={() => void trackEvent("buy_uruu_visit", { via: "twin_pillar" })}
              >
                Buy URUU
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/token/lattice">Fair lattice</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/bridge?mode=mainnet">Engage zkEVM</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="gap-1">
              <a href={URUU_EXPLORER} target="_blank" rel="noreferrer">
                Explorer
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
