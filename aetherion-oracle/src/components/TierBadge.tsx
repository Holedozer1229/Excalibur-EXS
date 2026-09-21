import { TIERS, type TierId } from "@/lib/tiers";
import { Sparkles } from "lucide-react";

interface Props {
  tier: TierId;
  onClick: () => void;
}

const TONE: Record<string, string> = {
  cyan:    "border-primary/60 text-primary bg-primary/10 hover:bg-primary/20 shadow-[0_0_12px_hsl(var(--neon-cyan)/0.45)]",
  magenta: "border-accent/60 text-magenta bg-accent/10 hover:bg-accent/20 shadow-[0_0_14px_hsl(var(--neon-magenta)/0.55)]",
  violet:  "border-[hsl(var(--neon-violet)/0.6)] text-violet bg-[hsl(var(--neon-violet)/0.12)] hover:bg-[hsl(var(--neon-violet)/0.22)] shadow-[0_0_14px_hsl(var(--neon-violet)/0.55)]",
};

export const TierBadge = ({ tier, onClick }: Props) => {
  const t = TIERS[tier];
  return (
    <button
      onClick={onClick}
      title="Manage subscription"
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border font-display uppercase tracking-widest text-[10px] transition-all ${TONE[t.accent]}`}
    >
      <Sparkles className="w-3 h-3" />
      {t.badge}
    </button>
  );
};
