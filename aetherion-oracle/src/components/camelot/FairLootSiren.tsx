import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Sword, X } from "lucide-react";
import { trackEvent } from "@/lib/funnel";
import { CAMELOT_FAIR_SUBTITLE } from "@/lib/camelotFair";
import { FOUNDER_ECONOMICS, fetchFounderSeatStatus, founderAuthHref } from "@/lib/founderEconomics";
import { formatRaidCountdown, secondsUntilUtcMidnight } from "@/lib/overnightVelocity";

const DISMISS_KEY = "ae_fair_loot_siren_dismissed";
const FOUNDER_SEATS = FOUNDER_ECONOMICS.seatCap;

export default function FairLootSiren() {
  const [hidden, setHidden] = useState(true);
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(() => formatRaidCountdown(secondsUntilUtcMidnight()));

  useEffect(() => {
    const id = window.setInterval(() => {
      setCountdown(formatRaidCountdown(secondsUntilUtcMidnight()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* noop */
    }
    setHidden(false);

    (async () => {
      const status = await fetchFounderSeatStatus();
      if (status) setSeatsLeft(status.remaining);
    })();
  }, []);

  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* noop */
    }
  };

  return (
    <div
      role="region"
      aria-label="Camelot Fair opening"
      className="relative z-30 border-b border-amber-500/40 bg-gradient-to-r from-amber-600/20 via-rose-600/15 to-violet-600/20 px-4 py-2.5"
      data-testid="fair-loot-siren"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 text-center sm:justify-between sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:justify-start">
          <Sword className="h-4 w-4 text-amber-300" />
          <span className="font-display uppercase tracking-widest text-amber-100">
            {CAMELOT_FAIR_SUBTITLE}
          </span>
          <span className="text-muted-foreground">·</span>
          <Link
            to="/black-pearl"
            onClick={() => void trackEvent("black_pearl_plunder", { via: "fair_siren" })}
            className="font-display text-amber-300 underline-offset-4 hover:underline"
          >
            ⚓ Black Pearl
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to="/overnight"
            onClick={() => void trackEvent("overnight_rail_click", { via: "fair_siren" })}
            className="font-mono text-amber-300 underline-offset-4 hover:underline"
          >
            Stack tonight · {countdown}
          </Link>
          <span className="text-muted-foreground">·</span>
          <Link
            to={founderAuthHref("fair_siren")}
            onClick={() => void trackEvent("founder_strip_click", { via: "fair_siren" })}
            className="text-amber-200 underline-offset-4 hover:underline"
          >
            Founder {FOUNDER_ECONOMICS.labelFirst}
          </Link>
          {seatsLeft !== null && seatsLeft > 0 && (
            <>
              <span className="hidden text-muted-foreground sm:inline">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-amber-200/90">
                <Flame className="h-3 w-3" />
                {seatsLeft} founder seats left
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/camelot-fair"
            className="rounded-full border border-amber-400/50 bg-amber-500/15 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-amber-100 hover:bg-amber-500/25"
            onClick={() => void trackEvent("founder_strip_click", { via: "fair_siren_camelot" })}
          >
            Enter the fair
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
