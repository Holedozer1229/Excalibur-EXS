import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useState } from "react";
import {
  MAX_EXTRACTION,
  protocolTakeSol,
  roundTripProtocolTake,
  minRoundTripFeePct,
} from "@/lib/maxExtraction";
import { formatSol } from "@/lib/fairLattice";

export default function MaxExtractionPanel() {
  const [volume, setVolume] = useState(1_000);
  const oneWay = protocolTakeSol(volume);
  const roundTrip = roundTripProtocolTake(volume);

  return (
    <Card className="mb-10 border-gold/40 bg-gold/5 backdrop-blur-sm" data-testid="max-extraction-panel">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg uppercase tracking-widest text-gold">
            Maximum allowable extraction
          </h2>
          <span className="font-mono text-[11px] text-muted-foreground">
            {MAX_EXTRACTION.feePercent}% each way · calculator default
          </span>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The most profit this lattice will quote is {MAX_EXTRACTION.feePercent}% of
          each swap input — the same on buy and sell. Round-trip pays about{" "}
          {minRoundTripFeePct().toFixed(2)}% in fees before impact. Anything above{" "}
          {MAX_EXTRACTION.maxPercent}% is refused. Exit stays open.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="extraction-volume">Illustrative SOL volume</Label>
            <span className="font-mono text-[11px]">{formatSol(volume, 0)} SOL</span>
          </div>
          <Slider
            id="extraction-volume"
            min={100}
            max={50_000}
            step={100}
            value={[volume]}
            onValueChange={(v) => setVolume(v[0] ?? 1_000)}
            aria-label="Illustrative swap volume in SOL"
          />
        </div>
        <dl className="grid gap-2 font-mono text-xs sm:grid-cols-2">
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <dt className="text-muted-foreground">One-way protocol take</dt>
            <dd className="mt-1 text-sm text-foreground">{formatSol(oneWay)} SOL</dd>
          </div>
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <dt className="text-muted-foreground">Round-trip take (buy then sell)</dt>
            <dd className="mt-1 text-sm text-foreground">{formatSol(roundTrip)} SOL</dd>
          </div>
        </dl>
        <p className="text-[11px] text-muted-foreground">
          The 0.3058% &ldquo;ghost&rdquo; number is below this cap. This page quotes at the
          maximum. Not live — no funds move.
        </p>
      </CardContent>
    </Card>
  );
}
