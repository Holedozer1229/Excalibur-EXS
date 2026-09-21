import { Link } from "react-router-dom";
import { Zap } from "lucide-react";
import { trackEvent } from "@/lib/funnel";

export default function DevnetRollupStrip() {
  return (
    <div
      role="region"
      aria-label="Devnet rollup"
      className="relative z-20 border-b border-cyan-500/30 bg-gradient-to-r from-cyan-600/15 via-violet-600/10 to-fuchsia-600/15 px-4 py-2"
      data-testid="devnet-rollup-strip"
    >
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 text-center text-sm sm:justify-between sm:text-left">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Zap className="h-4 w-4 text-cyan-300" />
          <span className="font-display text-xs uppercase tracking-[0.2em] text-cyan-100">
            Full devnet rollup live
          </span>
          <span className="hidden text-muted-foreground sm:inline">·</span>
          <span className="text-xs text-muted-foreground">
            Solana lattice · zkEVM · URUU · B2B deliberation
          </span>
        </div>
        <Link
          to="/rollup"
          onClick={() => void trackEvent("rollup_strip_click")}
          className="rounded-full border border-cyan-400/40 bg-cyan-500/15 px-3 py-1 text-[10px] font-mono uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-500/25"
        >
          Open command center →
        </Link>
      </div>
    </div>
  );
}
