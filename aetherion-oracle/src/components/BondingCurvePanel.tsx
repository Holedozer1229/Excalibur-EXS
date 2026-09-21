import { useId, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  DEFAULT_CURVE,
  DEFAULT_SCALE,
  MIN_N,
  MAX_N,
  PROTOCOL_FEE_BPS,
  PROTOCOL_FEE_PERCENT,
  CURVE_PRESETS,
  quoteBuy,
  quoteSell,
  roundTrip,
  formatSol,
  formatWuruu,
  spotPrice,
  sampleCurve,
  effectiveBuyPrice,
  effectiveSellPrice,
  type Curve,
} from "@/lib/customBondingCurve";
import { quoteBuy as quoteBuyCp, midPrice, DEFAULT_SOL_RESERVE, DEFAULT_WURUU_RESERVE } from "@/lib/fairLattice";

type Side = "buy" | "sell";

type Props = { compact?: boolean };

export default function BondingCurvePanel({ compact = false }: Props) {
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("1");
  const [n, setN] = useState<number>(CURVE_PRESETS[2].n);
  const [sold, setSold] = useState(DEFAULT_CURVE.sold);
  const plotId = useId();

  const feeBps = PROTOCOL_FEE_BPS;
  const feeLabel = `${PROTOCOL_FEE_PERCENT}% max`;

  const curve: Curve = useMemo(
    () => ({ ...DEFAULT_CURVE, n, sold }),
    [n, sold],
  );

  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;
  const buy = valid && side === "buy" ? quoteBuy(parsed, curve, feeBps) : null;
  const sell = valid && side === "sell" ? quoteSell(parsed, curve, feeBps) : null;
  const trip = valid && side === "buy" ? roundTrip(parsed, curve, feeBps) : null;
  const mid = spotPrice(curve);
  const samples = useMemo(() => sampleCurve(curve, 72, DEFAULT_SCALE * 2), [curve]);

  const cpPool = { sol: DEFAULT_SOL_RESERVE, wuruu: DEFAULT_WURUU_RESERVE };
  const cpCompare = valid && side === "buy"
    ? quoteBuyCp(parsed, cpPool)
    : valid && side === "sell"
      ? null
      : null;

  const swapRange = buy
    ? { s0: sold, s1: buy.curve.sold }
    : sell
      ? { s0: sell.curve.sold, s1: sold }
      : null;

  return (
    <Card className="bg-card/60 backdrop-blur-sm" data-testid="custom-bonding-curve">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className={`font-display uppercase tracking-widest text-accent ${compact ? "text-base" : "text-xl"}`}>
            Custom bonding curve
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            Spot {formatSol(mid, 8)} SOL · fee {feeLabel}
          </p>
        </div>

        <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
          P(s) = P₀ · (1 + s / S)<sup>n</sup>
          {" · "}two-way integral · n = {n.toFixed(2)}
        </p>

        <CurvePlot
          samples={samples}
          sold={sold}
          swapRange={swapRange}
          sMax={DEFAULT_SCALE * 2}
          plotId={plotId}
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Curve presets">
          {CURVE_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={Math.abs(n - p.n) < 0.06 ? "default" : "outline"}
              onClick={() => setN(p.n)}
              title={p.hint}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="curve-n">Curvature n</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {n === 0 ? "flat" : n < 1 ? "gentle" : n === 1 ? "linear" : "steep"}
              </span>
            </div>
            <Slider
              id="curve-n"
              min={MIN_N}
              max={MAX_N}
              step={0.05}
              value={[n]}
              onValueChange={(v) => setN(v[0] ?? DEFAULT_CURVE.n)}
              aria-label="Bonding curve curvature"
            />
          </div>
          {!compact && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="curve-sold">Tokens on the curve</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {formatWuruu(sold, 0)}
              </span>
            </div>
            <Slider
              id="curve-sold"
              min={0}
              max={DEFAULT_SCALE}
              step={50_000}
              value={[sold]}
              onValueChange={(v) => setSold(v[0] ?? 0)}
              aria-label="Tokens currently sold onto the curve"
            />
          </div>
          )}
        </div>

        <div className="flex gap-2" role="group" aria-label="Swap side">
          <Button
            type="button"
            size="sm"
            variant={side === "buy" ? "default" : "outline"}
            onClick={() => setSide("buy")}
          >
            Buy wURUU
          </Button>
          <Button
            type="button"
            size="sm"
            variant={side === "sell" ? "default" : "outline"}
            onClick={() => setSide("sell")}
          >
            Sell wURUU
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="curve-amount">
            {side === "buy" ? "SOL in" : "wURUU in"}
          </Label>
          <Input
            id="curve-amount"
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {buy && (
          <dl className="divide-y divide-border text-sm">
            <Row k="Protocol fee" v={`${formatSol(buy.feeSol)} SOL`} />
            <Row k="You receive" v={`${formatWuruu(buy.tokensOut)} wURUU`} />
            <Row k="Avg price" v={`${formatSol(effectiveBuyPrice(buy.netSol, buy.tokensOut), 8)} SOL`} />
            <Row k="Spot after" v={`${formatSol(buy.priceAfter, 8)} SOL`} />
            <Row k="Impact" v={`${buy.priceImpactPct.toFixed(3)}%`} />
            {cpCompare && !compact && (
              <Row
                k="vs xy=k (same fee)"
                v={`${formatWuruu(cpCompare.wuruuOut)} wURUU · mid ${formatSol(midPrice(cpPool), 8)}`}
              />
            )}
            {trip && (
              <Row
                k="If you sell it back"
                v={`${formatSol(trip.recovered)} SOL recovered · ${trip.leakedPct.toFixed(2)}% round-trip cost`}
              />
            )}
          </dl>
        )}

        {sell && (
          <dl className="divide-y divide-border text-sm">
            <Row k="Protocol fee" v={`${formatWuruu(sell.feeTokens)} wURUU`} />
            <Row k="You receive" v={`${formatSol(sell.solOut)} SOL`} />
            <Row k="Avg price" v={`${formatSol(effectiveSellPrice(sell.solOut, sell.netTokens), 8)} SOL`} />
            <Row k="Spot after" v={`${formatSol(sell.priceAfter, 8)} SOL`} />
            <Row k="Impact" v={`${sell.priceImpactPct.toFixed(3)}%`} />
          </dl>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {compact ? (
            <>Calculator only · 1% max fee · not a live pool.</>
          ) : (
            <>
              Illustrative virtual curve (P₀ {formatSol(DEFAULT_CURVE.p0, 8)} SOL,
              S {formatWuruu(DEFAULT_SCALE, 0)}). Shaded band is this swap on
              P(s). This panel does not send a transaction. Exit is the sell
              side — the inverse integral, not an operator unlock.
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}

function CurvePlot({
  samples,
  sold,
  swapRange,
  sMax,
  plotId,
}: {
  samples: Array<{ s: number; p: number }>;
  sold: number;
  swapRange: { s0: number; s1: number } | null;
  sMax: number;
  plotId: string;
}) {
  const W = 640;
  const H = 180;
  const pad = { l: 36, r: 12, t: 12, b: 22 };
  const innerW = W - pad.l - pad.r;
  const innerH = H - pad.t - pad.b;
  const yMax = Math.max(...samples.map((p) => p.p), 1e-12);
  const x = (s: number) => pad.l + (s / sMax) * innerW;
  const y = (p: number) => pad.t + innerH - (p / yMax) * innerH;
  const d = samples
    .map((pt, i) => `${i === 0 ? "M" : "L"}${x(pt.s).toFixed(2)},${y(pt.p).toFixed(2)}`)
    .join(" ");
  const markerX = x(Math.min(sold, sMax));
  const markerY = y(samples.reduce((best, pt) =>
    Math.abs(pt.s - sold) < Math.abs(best.s - sold) ? pt : best
  , samples[0]!).p);

  const swapPath = swapRange && swapRange.s1 > swapRange.s0
    ? (() => {
        const lo = Math.max(0, swapRange.s0);
        const hi = Math.min(sMax, swapRange.s1);
        const seg = samples.filter((pt) => pt.s >= lo && pt.s <= hi);
        if (seg.length < 2) return "";
        const top = seg.map((pt) => `${x(pt.s).toFixed(2)},${y(pt.p).toFixed(2)}`).join(" L");
        const bot = `${x(hi).toFixed(2)},${(pad.t + innerH).toFixed(2)} L${x(lo).toFixed(2)},${(pad.t + innerH).toFixed(2)} Z`;
        return `M${top} L${bot}`;
      })()
    : "";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-labelledby={`${plotId}-title ${plotId}-desc`}
      className="h-40 w-full overflow-visible rounded-md border border-border/60 bg-background/40"
    >
      <title id={`${plotId}-title`}>Bonding curve price versus tokens sold</title>
      <desc id={`${plotId}-desc`}>
        Spot price rises with tokens sold. Gold marker is current position; shaded band is the quoted swap.
      </desc>
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line
          key={t}
          x1={pad.l}
          x2={pad.l + innerW}
          y1={pad.t + innerH * (1 - t)}
          y2={pad.t + innerH * (1 - t)}
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
          opacity={0.5}
        />
      ))}
      {swapPath && (
        <path d={swapPath} fill="hsl(var(--primary) / 0.18)" stroke="none" />
      )}
      <path d={d} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" />
      <line
        x1={markerX}
        y1={pad.t}
        x2={markerX}
        y2={H - pad.b}
        stroke="hsl(var(--gold))"
        strokeDasharray="4 3"
        strokeWidth="1"
      />
      <circle cx={markerX} cy={markerY} r="5" fill="hsl(var(--gold))" />
      <text x={pad.l} y={H - 6} className="fill-muted-foreground" fontSize="9" fontFamily="monospace">
        0
      </text>
      <text x={pad.l + innerW - 4} y={H - 6} textAnchor="end" className="fill-muted-foreground" fontSize="9" fontFamily="monospace">
        {formatWuruu(sMax, 0)}
      </text>
      <text x={6} y={pad.t + 8} className="fill-muted-foreground" fontSize="9" fontFamily="monospace">
        P(s)
      </text>
    </svg>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-mono text-xs md:text-sm">{v}</dd>
    </div>
  );
}
