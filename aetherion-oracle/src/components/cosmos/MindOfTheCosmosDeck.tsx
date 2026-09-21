import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FALLBACK_VACUUM_STATUS,
  GAS_TANK_BPS,
  LIQUIDITY_BERTH,
  MIND_ARTIFICIAL_PATH,
  MIND_FLYWHEEL_PATH,
  MIND_OF_THE_COSMOS,
  MIND_SELF_FUND_PATH,
  MIND_STATUS_PATH,
  compoundIntoLiquidity,
  cosmosArtificialDust,
  cosmosCopy,
  cosmosFlywheel,
  cosmosSelfFund,
  readVacuumProfit,
  type ArtificialDustReport,
  type CosmosVacuumProfit,
  type EngineSelfFund,
  type FlywheelReport,
  type LiquidityCompound,
} from "@/lib/mindOfTheCosmos";

export default function MindOfTheCosmosDeck() {
  const copy = cosmosCopy();
  const [profit, setProfit] = useState<CosmosVacuumProfit | null>(null);
  const [compound, setCompound] = useState<LiquidityCompound | null>(null);
  const [selfFund, setSelfFund] = useState<EngineSelfFund | null>(null);
  const [flywheel, setFlywheel] = useState<FlywheelReport | null>(null);
  const [artificial, setArtificial] = useState<ArtificialDustReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const load = useCallback(async () => {
    let recordedGas: {
      l1WeiPerGas?: string;
      zkWeiPerGas?: string;
      l1BaseFeeWei?: string;
      gasSource?: "live" | "fallback";
    } = {};
    let recordedFlywheel: FlywheelReport | null = null;
    let recordedArtificial: ArtificialDustReport | null = null;
    try {
      const fundRes = await fetch(`${MIND_SELF_FUND_PATH}?t=${Date.now()}`);
      if (fundRes.ok) {
        const recorded = (await fundRes.json()) as EngineSelfFund;
        recordedGas = {
          l1WeiPerGas: recorded.liveGas?.l1WeiPerGas,
          zkWeiPerGas: recorded.liveGas?.zkWeiPerGas,
          l1BaseFeeWei: recorded.liveGas?.l1BaseFeeWei,
          gasSource: recorded.liveGas?.source,
        };
      }
    } catch {
      /* compute from fallback gas */
    }
    try {
      const flyRes = await fetch(`${MIND_FLYWHEEL_PATH}?t=${Date.now()}`);
      if (flyRes.ok) recordedFlywheel = (await flyRes.json()) as FlywheelReport;
    } catch {
      /* compute from leftover stock */
    }
    try {
      const millRes = await fetch(`${MIND_ARTIFICIAL_PATH}?t=${Date.now()}`);
      if (millRes.ok) recordedArtificial = (await millRes.json()) as ArtificialDustReport;
    } catch {
      /* mill from leftover stock */
    }

    try {
      const res = await fetch(`${MIND_STATUS_PATH}?t=${Date.now()}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      const p = readVacuumProfit(json);
      setProfit(p);
      setCompound(compoundIntoLiquidity({ netWei: p.netWei, intervalMs: p.intervalMs }));
      setSelfFund(
        cosmosSelfFund({
          netWei: p.netWei,
          intervalMs: p.intervalMs,
          dryRunCycles: p.cycle,
          ...recordedGas,
        }),
      );
      setFlywheel(
        recordedFlywheel ??
          cosmosFlywheel({
            netWei: p.netWei,
            intervalMs: p.intervalMs,
            dryRunCycles: p.cycle,
            ...recordedGas,
          }),
      );
      setArtificial(recordedArtificial ?? cosmosArtificialDust({ netWei: p.netWei }));
      setError(null);
    } catch (e) {
      const p = readVacuumProfit(FALLBACK_VACUUM_STATUS);
      setProfit(p);
      setCompound(compoundIntoLiquidity({ netWei: p.netWei, intervalMs: p.intervalMs }));
      setSelfFund(
        cosmosSelfFund({
          netWei: p.netWei,
          intervalMs: p.intervalMs,
          dryRunCycles: p.cycle,
          ...recordedGas,
        }),
      );
      setFlywheel(
        recordedFlywheel ??
          cosmosFlywheel({
            netWei: p.netWei,
            intervalMs: p.intervalMs,
            dryRunCycles: p.cycle,
            ...recordedGas,
          }),
      );
      setArtificial(recordedArtificial ?? cosmosArtificialDust({ netWei: p.netWei }));
      setError(e instanceof Error ? e.message : "status unavailable");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, tick]);

  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-8" data-testid="mind-of-the-cosmos-deck">
      <header className="space-y-3">
        <Badge variant="outline" className="tracking-[0.28em] uppercase text-[10px]">
          Vercel · 24/7 · mainnet
        </Badge>
        <h1
          id="mind-cosmos-heading"
          className="font-display text-4xl md:text-5xl tracking-tight text-foreground"
        >
          {MIND_OF_THE_COSMOS}
        </h1>
        <p className="text-muted-foreground font-serif text-lg leading-relaxed">{copy.tagline}</p>
        <p className="text-sm text-muted-foreground/90 leading-relaxed">{copy.body}</p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Button data-testid="mind-generate-profit" onClick={() => setTick((n) => n + 1)}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Generate profit now
        </Button>
        <Button variant="outline" asChild>
          <Link to="/black-pearl">Black Pearl helm</Link>
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="mind-status-error">
          Watch feed unavailable ({error}). Helm still compounds the last known leftover.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card data-testid="mind-profit-card">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Last cycle</p>
            <p className="text-3xl font-display">{profit?.verdict ?? "…"}</p>
            <p className="text-sm text-muted-foreground">
              Net <span className="text-foreground font-mono">{(profit?.netEth ?? 0).toFixed(6)}</span> ETH
              {compound ? ` · $${compound.extractedUsd.toFixed(2)}` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              Cycle {profit?.cycle ?? 0} · {profit?.mode ?? "dry-run"} · refresh 60s
            </p>
          </CardContent>
        </Card>
        <Card data-testid="mind-liquidity-card">
          <CardContent className="p-6 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Compound in liquidity</p>
            <p className="text-3xl font-display">
              {(flywheel?.split.berthEth ?? compound?.reinvestEth ?? 0).toFixed(6)}{" "}
              <span className="text-base text-muted-foreground">ETH</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Surplus after the {GAS_TANK_BPS / 100}% gas tank → {compound?.pair ?? "SKYNT / WETH"}
            </p>
            <p className="text-xs font-mono break-all text-muted-foreground">{LIQUIDITY_BERTH}</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="mind-flywheel-card">
        <CardContent className="p-6 space-y-4 text-sm leading-relaxed">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Uncharted dust flywheel
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">$/ dry-run</p>
              <p className="text-2xl font-display" data-testid="mind-flywheel-usd">
                ${(flywheel?.usdPerDryRun ?? selfFund?.usdPerDryRun ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                one-shot stock · not × cycles
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Uncharted sources
              </p>
              <p className="text-2xl font-display" data-testid="mind-flywheel-sources">
                {flywheel?.unchartedSourcesFound ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                {flywheel?.chainsReached ?? 0}/{flywheel?.chainsScanned ?? 0} seas reached ·{" "}
                {(flywheel?.unchartedExtractableEth ?? 0).toFixed(6)} ETH new
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Gas-tank self-fund
              </p>
              <p className="text-2xl font-display" data-testid="mind-flywheel-tank">
                ${(flywheel?.split.tankUsd ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {GAS_TANK_BPS / 100}% stays L1 ETH so the engine can sail again
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Berth compound</p>
              <p className="text-2xl font-display" data-testid="mind-flywheel-berth">
                ${(flywheel?.split.berthUsd ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                wraps to WETH → {flywheel?.split.destination ?? LIQUIDITY_BERTH}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Honest vs hypothetical / day
              </p>
              <p className="text-2xl font-display" data-testid="mind-flywheel-honest-day">
                ${(flywheel?.honest.usdPerDayAfterSweep ?? 0).toFixed(2)}
                <span className="text-sm text-muted-foreground font-serif"> honest</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Hypothetical if refilled every 60s: $
                {(flywheel?.hypotheticalIfRecurring.usdPerDayIf60sWatch ?? 0).toFixed(2)} — not APY
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{flywheel?.copy.body ?? copy.body}</p>
        </CardContent>
      </Card>

      <Card data-testid="mind-artificial-dust-card">
        <CardContent className="p-6 space-y-4 text-sm leading-relaxed">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Artificial dust mill · maybe
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Repack crumbs</p>
              <p className="text-2xl font-display" data-testid="mind-artificial-crumbs">
                {artificial?.crumbCount ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">same leftover well, ground finer</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Extractable</p>
              <p className="text-2xl font-display" data-testid="mind-artificial-usd">
                ${(artificial?.extractableUsd ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">not × crumbs · not new money</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Phantom maybe-lots</p>
              <p className="text-2xl font-display" data-testid="mind-artificial-phantom">
                {artificial?.phantom.length ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">
                ${(artificial?.phantomUsd ?? 0).toFixed(2)} theater — never profit
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{artificial?.note}</p>
        </CardContent>
      </Card>

      <Card data-testid="mind-self-fund-card">
        <CardContent className="p-6 space-y-4 text-sm leading-relaxed">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Engine self-fund / day
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">$/ dry-run</p>
              <p className="text-2xl font-display" data-testid="mind-usd-per-run">
                ${(selfFund?.usdPerDryRun ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selfFund?.pileEth ?? 0).toFixed(6)} ETH × ${selfFund?.ethUsdOracle ?? 2500}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Honest / day</p>
              <p className="text-2xl font-display" data-testid="mind-honest-per-day">
                ${(selfFund?.honest.usdPerDayAfterSweep ?? 0).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">after one sweep — stock, not a wage</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Hypothetical if recurring
              </p>
              <p className="text-2xl font-display text-muted-foreground" data-testid="mind-hypothetical-per-day">
                $
                {(
                  selfFund?.hypotheticalIfRecurring.usdPerDayIf60sWatch ??
                  selfFund?.hypotheticalIfRecurring.usdPerDay ??
                  0
                ).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">if the well refilled every 60s — not APY</p>
            </div>
          </div>
          <div data-testid="mind-scale-ops">
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Scale — ops this pile funds at {selfFund?.liveGas?.l1Gwei.toFixed(4) ?? "0.045"} gwei
            </p>
            <ul className="grid gap-1 sm:grid-cols-2 text-xs font-mono text-muted-foreground">
              <li>transfers (21k) · {selfFund?.scale.transfersFunded.toLocaleString() ?? "0"}</li>
              <li>claims (180k) · {selfFund?.scale.claimsFunded.toLocaleString() ?? "0"}</li>
              <li>deploys (1.2M) · {selfFund?.scale.deploysFunded.toLocaleString() ?? "0"}</li>
              <li>
                withdraw+finalize · {selfFund?.scale.withdrawPlusFinalizeFunded.toLocaleString() ?? "0"}
              </li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            {selfFund?.honest.note} Extra dry-runs re-read the same well. Cannot fund 137 ETH or ≥5 SOL.
            {selfFund?.spendability.note ? ` ${selfFund.spendability.note}` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3 text-sm leading-relaxed">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">24/7 loop</p>
          <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li>Inventory uncharted own-key leftover (value &gt; live fee).</li>
            <li>First cut ({GAS_TANK_BPS / 100}%) stays in the L1 gas tank so the engine never dies.</li>
            <li>Surplus wraps to WETH and compounds into the CREATE2 berth.</li>
            <li>Watch again in 60s. No new dust → no new profit.</li>
          </ol>
          <p className="text-xs text-muted-foreground">
            Recurring-day figure if the same leftover appeared every 60s: $
            {(selfFund?.hypotheticalIfRecurring.usdPerDayIf60sWatch ?? compound?.ifRecurringUsdPerDay ?? 0).toFixed(2)} — accounting fiction, not a promise.
            {CANONICAL_NOTE}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

const CANONICAL_NOTE = " 137 ETH proof-ledger is excluded.";
