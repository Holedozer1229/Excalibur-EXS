// /lattice/loop — the regal loop-hole: a quantum time loop on twelve court hours.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Crown, RefreshCw, Share2, Check, ArrowRight, Sparkles } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import RegalLoopRing from "@/components/RegalLoopRing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { computeRegalLoop, COURT, LOOP_HOURS } from "@/lib/quantumTimeLoop";

const SITE = "https://www.excaliburcrypto.com";

export default function QuantumTimeLoop() {
  const today = new Date().toISOString().slice(0, 10);
  const [params, setParams] = useSearchParams();
  const urlSeed = params.get("seed")?.trim();
  const [seed, setSeed] = useState(urlSeed || today);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [tick, setTick] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (seed && seed !== today) next.set("seed", seed);
    else next.delete("seed");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    const s = params.get("seed")?.trim();
    if (s && s !== seed) setSeed(s);
    if (!s && seed !== today) setSeed(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const loop = useMemo(() => computeRegalLoop(seed), [seed]);
  const hour = loop.ticks[Math.min(tick, LOOP_HOURS)];

  useEffect(() => {
    setTick(0);
  }, [seed]);

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setTick((t) => (t + 1) % (LOOP_HOURS + 1));
    }, 420);
    return () => window.clearInterval(id);
  }, [playing]);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : SITE}/lattice/loop?seed=${encodeURIComponent(seed)}`;

  async function handleShare() {
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({
          title: `Regal Loop-Hole — ${loop.sigil}`,
          text: `${loop.sovereignName} · ${loop.mixing}. Cast the same loop:`,
          url: shareUrl,
        });
        return;
      }
    } catch { /* copy */ }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Anyone opening it walks the same loop." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: shareUrl });
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "The Regal Loop-Hole — a quantum time loop",
    description:
      "Aetherion's regal loop-hole: a twelve-hour quantum clock whose state returns to the throne. Fiction and linear algebra — not a machine that rewrites clocks.",
    url: `${SITE}/lattice/loop`,
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="The Regal Loop-Hole — Quantum Time Loop | Aetherion"
        description="A twelve-hour quantum clock on a royal ring. The hole in the crown is the loop: after twelve ticks the state returns to the throne. Myth and math, not a rewrite of clocks."
        path="/lattice/loop"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 border-amber-300/40 text-amber-200">
            <Crown className="mr-1 h-3 w-3" /> QTΦ-Lattice · Regal loop
          </Badge>
          <h1 className="font-display text-3xl uppercase tracking-widest sm:text-5xl">
            The <span className="text-amber-300">Regal Loop-Hole</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            A cyclic shift on twelve court hours. After one dynasty of ticks the
            crown looks into its own eye — fidelity 1, a global phase the only
            souvenir. The hole in the ring is the loop.
          </p>
        </div>

        <Card className="mb-6 border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-center sm:p-6">
            <div className="flex-1">
              <div className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">Seed</div>
              <div className="font-mono text-sm text-amber-200">{loop.seed}</div>
            </div>
            <div className="flex flex-1 gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="A name, a question, a date…"
                className="bg-background/60"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && input.trim()) setSeed(input.trim());
                }}
              />
              <Button variant="secondary" onClick={() => setSeed(input.trim() || today)} disabled={!input.trim()}>
                Cast
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setInput(""); setSeed(today); }} title="Reset to today">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                title="Copy a shareable link to this loop"
                className="border-amber-300/50 text-amber-200 hover:bg-amber-300/10"
              >
                {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 border-amber-300/30 bg-gradient-to-br from-background/80 to-amber-900/10">
          <CardContent className="p-4 sm:p-6">
            <RegalLoopRing
              probs={hour.probs}
              tick={tick % LOOP_HOURS}
              fidelity={hour.fidelity}
              phase={hour.phase}
              sovereignHour={loop.sovereignHour}
            />
            <div className="mt-2 flex items-center justify-center gap-3">
              <Button size="sm" variant={playing ? "secondary" : "default"} onClick={() => setPlaying((p) => !p)}>
                {playing ? "Hold the hour" : "Let the court turn"}
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                hour {tick % LOOP_HOURS} / {LOOP_HOURS}
                {tick === LOOP_HOURS ? " · closed" : ""}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card className="border-amber-300/30 bg-gradient-to-br from-amber-900/20 to-background/80">
            <CardContent className="p-6 text-center">
              <div className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Sovereign hour</div>
              <h2 className="mt-2 font-display text-2xl text-amber-100">{loop.sovereignName}</h2>
              <p className="mt-3 text-sm italic text-muted-foreground">{COURT[loop.sovereignHour].oracle}</p>
            </CardContent>
          </Card>
          <Card className="border-violet-400/30 bg-gradient-to-br from-violet-900/20 to-background/80">
            <CardContent className="flex h-full flex-col items-center justify-center p-6 text-center">
              <div className="text-xs uppercase tracking-[0.2em] text-violet-200/80">House sigil</div>
              <div className="mt-2 font-mono text-4xl font-bold tracking-widest text-amber-100">{loop.sigil}</div>
              <div className="mt-3 text-xs uppercase tracking-[0.2em] text-violet-200/90">{loop.mixing}</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6 border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-6">
            <p className="text-sm leading-relaxed text-foreground/90">{loop.oracle}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
              <Metric label="Close fidelity" value={loop.fidelityClose.toFixed(6)} />
              <Metric label="Crown phase" value={`${((loop.globalPhase * 180) / Math.PI).toFixed(1)}°`} />
              <Metric label="Court mixing" value={`${loop.deutsch.entropy.toFixed(3)} bits`} />
              <Metric label="ω / tick" value={loop.omega.toFixed(4)} />
            </div>
          </CardContent>
        </Card>

        <article className="mb-8 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-xl uppercase tracking-widest text-amber-200">How the loop is a hole</h2>
          <p>
            Twelve houses sit on a ring. The unitary is a clock: each tick
            sends amplitude one house forward, dressed in a seed-phase ω.
            After twelve ticks the operator is only a global phase — the
            state is home. The empty center is the loop-hole: you look
            through it and see the same court you left.
          </p>
          <p>
            This is an oracle instrument. It does not travel, rewrite a
            clock, or change a fee. Same seed, same dynasty, always.
          </p>
        </article>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild size="lg" className="bg-amber-500 text-black hover:bg-amber-400">
            <Link to={`/lattice/force?seed=${encodeURIComponent(seed)}`}>
              <Sparkles className="mr-2 h-4 w-4" />
              Cast a Force vision from this seed
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/tarot">Seal a reading instead</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-amber-100">{value}</div>
    </div>
  );
}
