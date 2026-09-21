/**
 * Black Pearl command deck — pirate skin over the money rails.
 */
import { Link } from "react-router-dom";
import { Anchor, ArrowRight, Coins, Skull, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/funnel";
import {
  BLACK_PEARL,
  CAPTAIN_CALLSIGN,
  CREW_MOTTO,
  PLUNDER_RAILS,
  randomPirateGreeting,
} from "@/lib/blackPearl";
import { useMemo } from "react";
import OvernightVelocityRail from "@/components/overnight/OvernightVelocityRail";
import TreasureFundingPanel from "@/components/pirate/TreasureFundingPanel";
import BootySwapPanel from "@/components/pirate/BootySwapPanel";
import CaptainsCutPanel from "@/components/pirate/CaptainsCutPanel";

type Props = { className?: string };

export default function BlackPearlDeck({ className = "" }: Props) {
  const greeting = useMemo(() => randomPirateGreeting(), []);

  return (
    <section
      className={`space-y-8 ${className}`}
      data-testid="black-pearl-deck"
      aria-labelledby="black-pearl-heading"
    >
      <header className="text-center">
        <Badge className="mb-3 gap-1 bg-slate-900/80 text-amber-200 border-amber-600/50">
          <Skull className="h-3 w-3" />
          {BLACK_PEARL}
        </Badge>
        <h1
          id="black-pearl-heading"
          className="font-display text-4xl uppercase tracking-widest text-amber-100 md:text-5xl"
        >
          Arrr — all hands on deck
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">{greeting}</p>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.2em] text-amber-200/80">
          {CAPTAIN_CALLSIGN} · {CREW_MOTTO}
        </p>
      </header>

      <TreasureFundingPanel />

      <BootySwapPanel />

      <CaptainsCutPanel />

      <div className="grid gap-3 sm:grid-cols-2">
        {PLUNDER_RAILS.map((rail) => (
          <Card
            key={rail.id}
            className="border-amber-900/40 bg-gradient-to-br from-slate-950/90 via-card/80 to-amber-950/20"
          >
            <CardContent className="flex h-full flex-col p-5">
              <div className="mb-2 flex items-center gap-2">
                <Anchor className="h-4 w-4 text-amber-400" />
                <h2 className="font-display text-sm uppercase tracking-widest text-amber-100">
                  {rail.title}
                </h2>
              </div>
              <p className="flex-1 text-sm text-muted-foreground">{rail.pirateHook}</p>
              <p className="mt-2 font-mono text-[10px] text-amber-300/90">{rail.booty}</p>
              <Button asChild size="sm" className="mt-4 gap-1 bg-amber-700 hover:bg-amber-600">
                <Link
                  to={rail.href}
                  onClick={() => void trackEvent("black_pearl_plunder", { rail: rail.id })}
                >
                  {rail.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-violet-500/30 bg-violet-950/20">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 text-violet-300" />
            <div>
              <p className="font-display text-sm uppercase tracking-widest text-violet-200">
                Still fancy knights?
              </p>
              <p className="text-sm text-muted-foreground">
                Camelot Fair be on the same ship — quests, districts, and Round Table loot.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/camelot-fair">Enter Camelot Fair</Link>
          </Button>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 flex items-center gap-2 font-display text-xs uppercase tracking-widest text-muted-foreground">
          <Coins className="h-3.5 w-3.5" />
          Captain&apos;s midnight math (same ship, different flag)
        </p>
        <OvernightVelocityRail />
      </div>
    </section>
  );
}
