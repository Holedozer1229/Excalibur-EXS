import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { collapseIntent, formatBitRibbon, type BitCollapse } from "@/lib/wheelerBit";

function Hexagram({ lines }: { lines: number[] }) {
  return (
    <div className="flex flex-col gap-1.5" aria-label="Collapsed hexagram">
      {[...lines].reverse().map((line, i) => (
        <div key={i} className="flex items-center justify-center gap-1.5 h-2">
          {line === 1 ? (
            <div className="h-2 w-24 rounded-sm bg-amber-300/90 shadow-[0_0_18px_rgba(252,211,77,0.55)]" />
          ) : (
            <>
              <div className="h-2 w-10 rounded-sm bg-amber-300/90 shadow-[0_0_18px_rgba(252,211,77,0.55)]" />
              <div className="w-4" />
              <div className="h-2 w-10 rounded-sm bg-amber-300/90 shadow-[0_0_18px_rgba(252,211,77,0.55)]" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function BitCollapsePanel() {
  const [intent, setIntent] = useState("What bit does Bitcoin answer?");
  const [busy, setBusy] = useState(false);
  const [measurement, setMeasurement] = useState<BitCollapse | null>(null);

  async function collapse() {
    setBusy(true);
    try {
      setMeasurement(await collapseIntent(intent));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm" data-testid="bit-collapse-panel">
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-xl uppercase tracking-widest text-accent">
            Participatory collapse
          </h2>
          <span className="font-mono text-[10px] text-muted-foreground">SHA-256 · it from bit</span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Wheeler: every &ldquo;it&rdquo; — every particle, price, or prophecy — derives from
          binary answers. Type a question. The hash is the measurement. On Bitcoin,
          the same shape becomes a public inscription.
        </p>

        <div className="space-y-2">
          <Label htmlFor="wheeler-intent">Your question (intent)</Label>
          <Input
            id="wheeler-intent"
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="What am I measuring?"
          />
        </div>

        <Button type="button" onClick={collapse} disabled={busy}>
          {busy ? "Collapsing…" : "Collapse to bits"}
        </Button>

        {measurement && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{measurement.state}</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {measurement.ones}/256 ones · H={measurement.bitEntropy.toFixed(3)}
                </span>
              </div>
              <Hexagram lines={measurement.lines} />
              <p className="text-sm">
                <span className="font-mono text-primary">#{measurement.hexNumber}</span>{" "}
                {measurement.hexName} — {measurement.hexMeaning}
              </p>
            </div>

            <dl className="space-y-2 font-mono text-xs">
              <div>
                <dt className="text-muted-foreground">Commitment</dt>
                <dd className="break-all">{measurement.hashHex}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">First 64 bits</dt>
                <dd className="break-all text-[10px] leading-relaxed">
                  {formatBitRibbon(measurement.bits, 8)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Bitcoin layer</dt>
                <dd className="text-[11px] leading-relaxed text-foreground/90">
                  Same hash could seal a{" "}
                  <Link to="/claim/tart" className="text-primary hover:underline">BRC-20</Link>{" "}
                  receipt or anchor an{" "}
                  <Link to="/mining" className="text-primary hover:underline">EXCALIBUR</Link>{" "}
                  round. Public bits — no operator unlock.
                </dd>
              </div>
            </dl>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Deterministic, client-side only. This panel does not inscribe on Bitcoin.
        </p>
      </CardContent>
    </Card>
  );
}
