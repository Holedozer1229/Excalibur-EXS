/**
 * Treasure booty panel — shows verified proofs funding the rollup deploy.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Anchor, Coins, Skull, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  computeRollupFundingFromTreasure,
  MAINNET_SOL_BUDGET,
  TREASURE_PROOFS,
  TREASURE_VAULT,
} from "@/lib/pirateTreasureFunding";

type Props = { compact?: boolean; className?: string };

export default function TreasureFundingPanel({ compact = false, className = "" }: Props) {
  const ledger = useMemo(() => computeRollupFundingFromTreasure(), []);

  return (
    <Card
      className={`border-amber-700/50 bg-gradient-to-br from-slate-950/95 via-amber-950/10 to-slate-900/90 ${className}`}
      data-testid="treasure-funding-panel"
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 gap-1 bg-amber-900/60 text-amber-100 border-amber-600/40">
              <Skull className="h-3 w-3" />
              Davy Jones booty
            </Badge>
            <h2 className="font-display text-lg uppercase tracking-widest text-amber-100">
              {compact ? "Plunder-funded rollup" : "Treasure funds the rollup"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{ledger.captainGreeting}</p>
          </div>
          <div className="text-right font-mono text-xs text-amber-200/90">
            <p>{ledger.totalEthBooty.toFixed(3)} ETH booty</p>
            <p>{Math.round(ledger.solAffordable).toLocaleString()} SOL affordable</p>
            <p className="text-emerald-400">
              {ledger.fullyFunded ? "✓ Fully funded" : "⊘ Top up faucet"}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <Stat label="Canonical ETH" value={`${ledger.canonicalEthBooty.toFixed(2)}`} />
          <Stat label="Deploy budget" value={`${ledger.solBudgetNeeded} SOL`} />
          <Stat label="Mainnet scale" value={`${MAINNET_SOL_BUDGET.toLocaleString()} SOL`} />
        </div>

        {!compact && (
          <ul className="max-h-48 space-y-1.5 overflow-y-auto text-xs">
            {TREASURE_PROOFS.filter((p) => p.ethAmount > 0 || p.kind === "davy_jones_receipt").map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded border border-amber-900/30 bg-black/20 px-2 py-1.5">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Anchor className="h-3 w-3 shrink-0 text-amber-500" />
                  {p.label}
                </span>
                <a
                  href={p.href}
                  className="shrink-0 font-mono text-amber-300/80 hover:text-amber-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {p.ethAmount > 0 ? `${p.ethAmount} ETH` : "proof"}
                </a>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-amber-900/30 pt-3">
          <p className="font-mono text-[10px] text-muted-foreground">
            Vault {TREASURE_VAULT.slice(0, 10)}… · /treasure/booty-manifest.json
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline" className="gap-1 border-amber-700/50">
              <a href="/treasure/booty-manifest.json" target="_blank" rel="noopener noreferrer">
                <Coins className="h-3.5 w-3.5" />
                Manifest
              </a>
            </Button>
            <Button asChild size="sm" className="gap-1 bg-amber-700 hover:bg-amber-600">
              <Link to="/rollup">
                <Sparkles className="h-3.5 w-3.5" />
                Rollup deck
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-amber-900/30 bg-black/25 px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-mono text-sm text-amber-100">{value}</p>
    </div>
  );
}
