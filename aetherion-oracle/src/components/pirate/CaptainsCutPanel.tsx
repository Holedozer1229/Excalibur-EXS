/**
 * Captain's cut panel — retrologarithmic drips every 15 min to external vault.
 */
import { useMemo, type ReactNode } from "react";
import { Coins, KeyRound, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CAPTAINS_CUT_INTERVAL_MIN,
  CAPTAINS_CUT_SHARE_BPS,
  CAPTAINS_CUT_WORD_COUNT,
  computeRetrologDripWei,
  currentUtcDripIndex,
  DEFAULT_EXTERNAL_VAULT,
  DRIPS_PER_UTC_DAY,
  planRetrologDrips,
  weiToEthString,
} from "@/lib/retrologarithmicCut";
import {
  CAPTAINS_CUT_PROFIT_WEI,
  ETH_USD_ORACLE,
  MAINNET_SOL_BUDGET,
  TREASURE_VAULT,
} from "@/lib/pirateTreasureFunding";

type Props = {
  /** Pure profit for preview (wei). Default: full 137.19 ETH Davy Jones booty. */
  pureProfitWei?: bigint;
  className?: string;
};

const FULL_BOOTY_PROFIT_WEI = CAPTAINS_CUT_PROFIT_WEI;

export default function CaptainsCutPanel({
  pureProfitWei = FULL_BOOTY_PROFIT_WEI,
  className = "",
}: Props) {
  const dripIndex = useMemo(() => currentUtcDripIndex(), []);
  const nextDripWei = useMemo(
    () => computeRetrologDripWei(pureProfitWei, dripIndex),
    [pureProfitWei, dripIndex],
  );
  const nextDripUsd = useMemo(
    () => (Number(nextDripWei) / 1e18) * ETH_USD_ORACLE,
    [nextDripWei],
  );
  const todayPlan = useMemo(() => planRetrologDrips(pureProfitWei), [pureProfitWei]);
  const captainTotalWei = useMemo(
    () => todayPlan.reduce((s, d) => s + d.amountWei, 0n),
    [todayPlan],
  );

  const vault = TREASURE_VAULT || DEFAULT_EXTERNAL_VAULT;

  return (
    <Card
      className={`border-amber-600/40 bg-gradient-to-br from-slate-950/95 to-amber-950/15 ${className}`}
      data-testid="captains-cut-panel"
      id="captains-cut"
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 gap-1 bg-amber-900/50 text-amber-100 border-amber-600/40">
              <Coins className="h-3 w-3" />
              Captain&apos;s cut
            </Badge>
            <h2 className="font-display text-lg uppercase tracking-widest text-amber-100">
              Retrologarithmic drips
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Pure profit split every {CAPTAINS_CUT_INTERVAL_MIN} minutes — larger plunder early, tapering by
              log toward UTC midnight. Signed with your {CAPTAINS_CUT_WORD_COUNT}-word captain&apos;s key (server
              secret only).
            </p>
          </div>
          <div className="text-right font-mono text-xs text-amber-200/90">
            <p>Slot {dripIndex + 1} / {DRIPS_PER_UTC_DAY}</p>
            <p>{(CAPTAINS_CUT_SHARE_BPS / 100).toFixed(2)}% of pure profit</p>
            <p className="text-emerald-400">
              Next: {weiToEthString(nextDripWei)} ETH (~${nextDripUsd.toFixed(0)})
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat icon={<Timer className="h-3.5 w-3.5" />} label="Interval" value={`${CAPTAINS_CUT_INTERVAL_MIN} min`} />
          <Stat icon={<KeyRound className="h-3.5 w-3.5" />} label="Key" value={`${CAPTAINS_CUT_WORD_COUNT} words`} />
          <Stat icon={<Coins className="h-3.5 w-3.5" />} label="Today (captain)" value={`${weiToEthString(captainTotalWei)} ETH`} />
          <Stat icon={<Coins className="h-3.5 w-3.5" />} label="Mainnet SOL" value={`${MAINNET_SOL_BUDGET.toLocaleString()}`} />
        </div>

        <p className="font-mono text-[10px] text-muted-foreground">
          External vault {vault.slice(0, 10)}… · Worker: <code>captains-cut-worker</code> · Cron:{" "}
          <code>*/15 * * * *</code>
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded border border-amber-900/30 bg-black/25 px-3 py-2">
      <span className="text-amber-500">{icon}</span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-mono text-sm text-amber-100">{value}</p>
      </div>
    </div>
  );
}
