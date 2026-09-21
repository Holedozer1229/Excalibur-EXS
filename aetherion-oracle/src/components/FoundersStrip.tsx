import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { trackEvent } from "@/lib/funnel";
import {
  FOUNDER_ECONOMICS,
  founderAuthHref,
  fetchFounderSeatStatus,
} from "@/lib/founderEconomics";

const FOUNDER_SEATS_TOTAL = FOUNDER_ECONOMICS.seatCap;

export default function FoundersStrip() {
  const [seatsRemaining, setSeatsRemaining] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const status = await fetchFounderSeatStatus();
      if (status) setSeatsRemaining(status.remaining);
    })();
  }, []);

  if (seatsRemaining !== null && seatsRemaining <= 0) return null;

  const claimed =
    seatsRemaining !== null ? FOUNDER_SEATS_TOTAL - seatsRemaining : null;
  const remaining = seatsRemaining ?? FOUNDER_SEATS_TOTAL;

  return (
    <div
      role="region"
      aria-label="Founder offer"
      className="relative z-30 border-b border-violet-500/30 bg-gradient-to-r from-violet-600/15 via-fuchsia-600/10 to-cyan-600/10 px-4 py-2.5"
      data-testid="founders-strip"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 text-center sm:justify-between sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 text-sm sm:justify-start">
          <Flame className="h-4 w-4 text-fuchsia-300" />
          <span className="font-display text-xs uppercase tracking-[0.2em] text-violet-100">
            Founder seats · first {FOUNDER_SEATS_TOTAL}
          </span>
          <span className="text-muted-foreground line-through">{FOUNDER_ECONOMICS.labelRenew}</span>
          <span className="font-mono font-semibold text-fuchsia-200">
            {FOUNDER_ECONOMICS.labelFirst} first mo
          </span>
          {claimed !== null && (
            <span className="text-xs text-muted-foreground">
              · {claimed}/{FOUNDER_SEATS_TOTAL} claimed · {remaining} left
            </span>
          )}
        </div>
        <Link
          to={founderAuthHref("founder_strip")}
          onClick={() =>
            void trackEvent("founder_strip_click", {
              seats_remaining: seatsRemaining ?? undefined,
              via: "top_strip",
            })
          }
          className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/40 bg-violet-500/15 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-violet-100 transition hover:border-violet-300/60 hover:bg-violet-500/25"
        >
          Claim founder seat — {remaining} of {FOUNDER_SEATS_TOTAL} left
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
