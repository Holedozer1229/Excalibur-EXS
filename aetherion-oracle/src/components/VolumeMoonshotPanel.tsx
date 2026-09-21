import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Copy, Rocket } from "lucide-react";
import { formatSol } from "@/lib/fairLattice";
import {
  MOONSHOT_PRESETS,
  projectMoonshot,
  effectiveFeePct,
} from "@/lib/volumeMoonshot";
import {
  captureReferralFromSearch,
  defaultOrigin,
  ensureUserReferralCode,
  latticeShareUrl,
} from "@/lib/curveShare";
import { trackEvent } from "@/lib/funnel";

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export default function VolumeMoonshotPanel() {
  const [dailyVol, setDailyVol] = useState<number>(MOONSHOT_PRESETS[2].dailySolVolume);
  const [roundTrip, setRoundTrip] = useState<number>(MOONSHOT_PRESETS[2].roundTripShare);
  const [solUsd, setSolUsd] = useState(150);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    captureReferralFromSearch(window.location.search);
    (async () => {
      const userCode = await ensureUserReferralCode();
      setShareCode(userCode);
    })();
  }, []);

  const projection = useMemo(
    () => projectMoonshot({ dailySolVolume: dailyVol, roundTripShare: roundTrip, solUsd }),
    [dailyVol, roundTrip, solUsd],
  );

  const shareLink = useMemo(() => {
    if (!shareCode) return "";
    return latticeShareUrl(defaultOrigin(), shareCode);
  }, [shareCode]);

  async function copyShare() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      void trackEvent("curve_referral_link_copied", { code: shareCode, target: "moonshot" });
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card
      className="mb-10 border-rose-500/40 bg-gradient-to-br from-rose-500/10 via-gold/5 to-transparent backdrop-blur-sm"
      data-testid="volume-moonshot-panel"
    >
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-widest text-rose-300">
            <Rocket className="h-4 w-4" />
            Volume moonshot
          </h2>
          <span className="font-mono text-[11px] text-muted-foreground">
            hypothetical · not a promise
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          I am not sure anyone routes here yet. If they did — at the{" "}
          {projection.effectiveFeePct.toFixed(2)}% blended take (1% cap, some
          round-trips) — this is what the disclosed fee alone could look like.
          No hidden skim. No live pool. Pure math on volume you do not have
          until you send it.
        </p>

        <div className="rounded-lg border border-gold/30 bg-background/50 p-4 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Year-one protocol take (fees only)
          </p>
          <p className="mt-1 font-mono text-3xl text-gold md:text-4xl" data-testid="moonshot-yearly">
            {formatSol(projection.yearlySol, 0)} SOL
          </p>
          <p className="mt-1 font-mono text-sm text-rose-200/90">
            ≈ {fmtUsd(projection.yearlyUsd)} at ${solUsd}/SOL
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {MOONSHOT_PRESETS.map((p) => (
            <Button
              key={p.id}
              type="button"
              size="sm"
              variant={dailyVol === p.dailySolVolume ? "default" : "outline"}
              className="text-xs"
              onClick={() => {
                setDailyVol(p.dailySolVolume);
                setRoundTrip(p.roundTripShare);
              }}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="moon-daily-vol">Daily SOL through curve</Label>
              <span className="font-mono text-[11px]">{formatSol(dailyVol, 0)} SOL</span>
            </div>
            <Slider
              id="moon-daily-vol"
              min={50}
              max={100_000}
              step={50}
              value={[dailyVol]}
              onValueChange={(v) => setDailyVol(v[0] ?? dailyVol)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="moon-round-trip">Round-trip share</Label>
              <span className="font-mono text-[11px]">
                {(roundTrip * 100).toFixed(0)}% · {effectiveFeePct(roundTrip).toFixed(2)}% blended
              </span>
            </div>
            <Slider
              id="moon-round-trip"
              min={0}
              max={100}
              step={5}
              value={[roundTrip * 100]}
              onValueChange={(v) => setRoundTrip((v[0] ?? 0) / 100)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="moon-sol-usd">SOL/USD (display)</Label>
              <span className="font-mono text-[11px]">${solUsd}</span>
            </div>
            <Slider
              id="moon-sol-usd"
              min={50}
              max={500}
              step={5}
              value={[solUsd]}
              onValueChange={(v) => setSolUsd(v[0] ?? solUsd)}
            />
          </div>
        </div>

        <dl className="grid gap-2 font-mono text-xs sm:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <dt className="text-muted-foreground">Daily</dt>
            <dd className="mt-1 text-sm">{formatSol(projection.dailySol)} SOL</dd>
          </div>
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <dt className="text-muted-foreground">Monthly</dt>
            <dd className="mt-1 text-sm">{formatSol(projection.monthlySol, 0)} SOL</dd>
          </div>
          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <dt className="text-muted-foreground">Blended fee</dt>
            <dd className="mt-1 text-sm">{projection.effectiveFeePct.toFixed(2)}%</dd>
          </div>
        </dl>

        <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-background/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Viral bet — share the calculator
            </p>
            {shareLink ? (
              <p className="truncate font-mono text-[11px] text-foreground/90">{shareLink}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                <a href="/auth" className="text-primary hover:underline">Sign in</a> for your referral link.
              </p>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 gap-1"
            onClick={copyShare}
            disabled={!shareLink}
          >
            <Copy className="h-3 w-3" />
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Referral codes use the same storage as /auth signups. Aetherion makes no return claims.
          Insane money requires insane volume at a fee you already capped at 1%.
        </p>
      </CardContent>
    </Card>
  );
}
