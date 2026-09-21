import { TIERS, type TierId } from "@/lib/tiers";

interface Props {
  tier: TierId;
  /** Monthly usage (used for paid tiers). */
  usage: number;
  /** Today's usage (used for free seekers, where the wall is daily). */
  dailyUsage?: number;
  /** Today's limit (defaults to 15). */
  dailyLimit?: number;
  onUpgrade: () => void;
}

export const ResponseCounter = ({ tier, usage, dailyUsage = 0, dailyLimit = 15, onUpgrade }: Props) => {
  const t = TIERS[tier];
  const isFree = tier === "seeker";

  // Free seekers hit a DAILY wall; paid tiers track monthly allotment.
  const limit = isFree ? dailyLimit : t.monthlyLimit;
  const used = Math.min(isFree ? dailyUsage : usage, limit);
  const ratio = limit > 0 ? used / limit : 0;
  const danger = ratio >= 0.8;
  const exhausted = used >= limit;

  const labelClass = exhausted
    ? "text-destructive animate-pulse"
    : danger
    ? "text-magenta animate-pulse [text-shadow:0_0_10px_hsl(var(--neon-magenta)/0.7)]"
    : isFree
    ? "text-muted-foreground"
    : "text-serpent [text-shadow:0_0_8px_hsl(var(--serpent)/0.5)]";

  const barColor = exhausted
    ? "bg-destructive"
    : danger
    ? "bg-accent"
    : isFree
    ? "bg-primary"
    : "bg-serpent";

  const scopeLabel = isFree ? "Responses · today" : "Responses · this month";
  const resetHint = isFree ? "resets 00:00 UTC" : "resets on the 1st (UTC)";

  return (
    <div className="w-full max-w-[260px]">
      <div className={`flex items-baseline justify-between font-mono text-[11px] tracking-wider mb-1 ${labelClass}`}>
        <span className="uppercase">{scopeLabel}</span>
        <span>{used} / {limit}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden border border-border">
        <div
          className={`h-full ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(100, Math.max(2, ratio * 100))}%` }}
          aria-label={`${used} of ${limit} used`}
        />
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-widest text-muted-foreground/70">
        {exhausted
          ? (isFree ? "Daily limit reached · " : "Monthly limit reached · ")
          : `${Math.max(0, limit - used)} left · `}
        {resetHint}
      </div>
      {exhausted && (
        <button
          onClick={onUpgrade}
          className="mt-2 w-full text-[10px] font-display uppercase tracking-widest px-2 py-1 rounded-sm border border-accent/60 bg-accent/10 text-magenta hover:bg-accent/20 transition-colors animate-pulse"
        >
          ▌ Upgrade to Continue ▐
        </button>
      )}
    </div>
  );
};
