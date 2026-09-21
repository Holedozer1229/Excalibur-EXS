import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  PROTOCOL_FEE_PERCENT,
  DEFAULT_SOL_RESERVE,
  DEFAULT_WURUU_RESERVE,
  quoteBuy,
  quoteSell,
  roundTrip,
  formatSol,
  formatWuruu,
  midPrice,
} from "@/lib/fairLattice";

type Side = "buy" | "sell";

export default function FairCurvePanel() {
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("1");
  const pool = useMemo(
    () => ({ sol: DEFAULT_SOL_RESERVE, wuruu: DEFAULT_WURUU_RESERVE }),
    [],
  );
  const parsed = Number(amount);
  const valid = Number.isFinite(parsed) && parsed > 0;

  const buy = valid && side === "buy" ? quoteBuy(parsed, pool) : null;
  const sell = valid && side === "sell" ? quoteSell(parsed, pool) : null;
  const trip = valid && side === "buy" ? roundTrip(parsed, pool) : null;
  const mid = midPrice(pool);

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl uppercase tracking-widest text-accent">
            Two-way quote
          </h2>
          <p className="font-mono text-[11px] text-muted-foreground">
            Mid {formatSol(mid, 8)} SOL / wURUU · fee {PROTOCOL_FEE_PERCENT}% cap
          </p>
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
          <Label htmlFor="fair-amount">
            {side === "buy" ? "SOL in" : "wURUU in"}
          </Label>
          <Input
            id="fair-amount"
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
            <Row k="You receive" v={`${formatWuruu(buy.wuruuOut)} wURUU`} />
            <Row k="Price after" v={`${formatSol(buy.priceAfter, 8)} SOL`} />
            <Row k="Impact" v={`${buy.priceImpactPct.toFixed(3)}%`} />
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
            <Row k="Protocol fee" v={`${formatWuruu(sell.feeWuruu)} wURUU`} />
            <Row k="You receive" v={`${formatSol(sell.solOut)} SOL`} />
            <Row k="Price after" v={`${formatSol(sell.priceAfter, 8)} SOL`} />
            <Row k="Impact" v={`${sell.priceImpactPct.toFixed(3)}%`} />
          </dl>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Illustrative virtual reserves ({formatSol(DEFAULT_SOL_RESERVE, 0)} SOL
          / {formatWuruu(DEFAULT_WURUU_RESERVE, 0)} wURUU). This panel does not
          send a transaction. Exit is the sell side — not an operator unlock.
        </p>
      </CardContent>
    </Card>
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
