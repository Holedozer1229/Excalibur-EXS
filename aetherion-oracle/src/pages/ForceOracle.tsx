// /lattice/force — Daily Force Oracle.
// Deterministic per-day quantum-phonotactic vision: hexagram + attractor + sigil.

import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { motion } from "framer-motion";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, RefreshCw, Hash, Flame, ArrowRight, Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import GalacticBackground from "@/components/GalacticBackground";
import { computeForce } from "@/lib/forceOracle";
import { toast } from "@/hooks/use-toast";

const SITE = "https://www.excaliburcrypto.com";

function Hexagram({ lines }: { lines: number[] }) {
  // Render bottom-to-top per I Ching convention.
  return (
    <div className="flex flex-col gap-1.5">
      {[...lines].reverse().map((line, i) => (
        <div key={i} className="flex items-center justify-center gap-1.5 h-2">
          {line === 1 ? (
            <div className="w-24 h-2 rounded-sm bg-amber-300/90 shadow-[0_0_18px_rgba(252,211,77,0.55)]" />
          ) : (
            <>
              <div className="w-10 h-2 rounded-sm bg-amber-300/90 shadow-[0_0_18px_rgba(252,211,77,0.55)]" />
              <div className="w-4" />
              <div className="w-10 h-2 rounded-sm bg-amber-300/90 shadow-[0_0_18px_rgba(252,211,77,0.55)]" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default function ForceOracle() {
  const today = new Date().toISOString().slice(0, 10);
  const [params, setParams] = useSearchParams();
  const urlSeed = params.get("seed")?.trim();
  const [seed, setSeed] = useState<string>(urlSeed || today);
  const [input, setInput] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // Sync seed -> URL (only push ?seed= when it differs from "today")
  useEffect(() => {
    const next = new URLSearchParams(params);
    if (seed && seed !== today) next.set("seed", seed);
    else next.delete("seed");
    if (next.toString() !== params.toString()) {
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  // Sync URL -> seed (back/forward navigation)
  useEffect(() => {
    const s = params.get("seed")?.trim();
    if (s && s !== seed) setSeed(s);
    if (!s && seed !== today) setSeed(today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const vision = useMemo(() => computeForce(seed), [seed]);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : SITE}/lattice/force?seed=${encodeURIComponent(seed)}`;

  async function handleShare() {
    const shareData = {
      title: `Force Oracle — ${vision.sigil.toUpperCase()}`,
      text: `My Force Vision: ${vision.hexLabel} · ${vision.sigil.toUpperCase()} · ${vision.alignment}. Cast yours from the same seed:`,
      url: shareUrl,
    };
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share(shareData);
        return;
      }
    } catch { /* fall through to copy */ }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "Anyone opening it sees the exact same vision." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: shareUrl });
    }
  }

  const alignmentColor = {
    JEDI: "from-sky-400/30 to-cyan-300/10 border-sky-400/40 text-sky-200",
    SITH: "from-rose-500/30 to-red-700/10 border-rose-500/40 text-rose-200",
    "BOUNTY HUNTER": "from-amber-400/30 to-orange-500/10 border-amber-400/40 text-amber-200",
  }[vision.alignment];

  return (
    <div className="relative min-h-screen text-foreground">
      <Helmet>
        <title>{`Force Oracle — ${vision.sigil.toUpperCase()} · ${vision.hexLabel} | Aetherion`}</title>
        <meta name="description" content={`Force Vision for seed "${vision.seed}": hexagram ${vision.hexLabel}, sigil ${vision.sigil.toUpperCase()}, alignment ${vision.alignment}.`} />
        <link rel="canonical" href={`${SITE}/lattice/force${seed !== today ? `?seed=${encodeURIComponent(seed)}` : ""}`} />
        <meta property="og:title" content={`Force Oracle — ${vision.sigil.toUpperCase()}`} />
        <meta property="og:description" content={`${vision.hexLabel} · ${vision.alignment}. Open to cast from the same seed.`} />
      </Helmet>
      <GalacticBackground />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center mb-8">
          <Badge variant="outline" className="border-amber-300/40 text-amber-200 mb-3">
            <Sparkles className="w-3 h-3 mr-1" /> QTΦ-Lattice v6 · Surprise Module
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            The <span className="text-amber-300">Force Oracle</span>
          </h1>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            A 12-phoneme quantum field evolves 64 steps through a Hermitian Hamiltonian.
            The collapse measures one of 64 hexagrams, a self-referential attractor, and a
            sigil-name encoded by the day itself.
          </p>
        </div>

        {/* Seed control */}
        <Card className="bg-card/60 backdrop-blur border-border/60 mb-6">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Seed</div>
              <div className="font-mono text-sm text-amber-200">{vision.seed}</div>
            </div>
            <div className="flex gap-2 flex-1">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a name, question, or date…"
                className="bg-background/60"
              />
              <Button
                variant="secondary"
                onClick={() => setSeed(input.trim() || today)}
                disabled={!input.trim()}
              >
                Cast
              </Button>
              <Button variant="outline" size="icon" onClick={() => { setInput(""); setSeed(today); }} title="Reset to today">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleShare}
                title="Copy a shareable link to this exact vision"
                className="border-amber-300/50 text-amber-200 hover:bg-amber-300/10"
              >
                {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Hexagram */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="bg-gradient-to-br from-background/80 to-amber-900/10 border-amber-300/30 h-full">
              <CardContent className="p-6 flex flex-col items-center">
                <div className="text-xs uppercase tracking-wider text-amber-200/80 mb-3">
                  Hexagram #{vision.hexagram}
                </div>
                <Hexagram lines={vision.hexBinary} />
                <h2 className="text-2xl font-bold mt-5 text-amber-100">{vision.hexLabel}</h2>
                <p className="text-center text-muted-foreground mt-2 italic">
                  "{vision.hexMeaning}"
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sigil + alignment */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className={`bg-gradient-to-br ${alignmentColor} border h-full`}>
              <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <div className="text-xs uppercase tracking-wider opacity-80 mb-2">
                  Your Sigil-Name
                </div>
                <div className="font-mono text-4xl sm:text-5xl font-bold tracking-widest break-all">
                  {vision.sigil.toUpperCase()}
                </div>
                <div className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] opacity-90">
                  <Flame className="w-3 h-3" /> Alignment · {vision.alignment}
                </div>
                <div className="mt-5 text-sm opacity-80">
                  Attractor singularity:&nbsp;
                  <span className="font-mono text-base">{vision.attractor.toUpperCase()}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Metrics */}
        <Card className="bg-card/60 backdrop-blur border-border/60 mt-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <Metric label="Force Metric" value={vision.forceMetric.toFixed(4)} />
              <Metric label="Top Phoneme" value={`|${vision.topPhoneme}⟩`} />
              <Metric label="Entropy" value={`${vision.entropy.toFixed(3)} bits`} />
              <Metric label="Hex Binary" value={vision.hexBinary.join("")} />
            </div>

            <div className="mt-6">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
                Phoneme distribution
              </div>
              <div className="space-y-1.5">
                {vision.finalProbs.slice(0, 6).map((p) => (
                  <div key={p.phoneme} className="flex items-center gap-3">
                    <div className="w-10 font-mono text-sm text-amber-200">|{p.phoneme}⟩</div>
                    <div className="flex-1 h-2 rounded-full bg-background/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-300 to-rose-400"
                        style={{ width: `${Math.min(100, p.p * 600)}%` }}
                      />
                    </div>
                    <div className="w-14 text-right font-mono text-xs text-muted-foreground">
                      {p.p.toFixed(3)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-8 grid sm:grid-cols-2 gap-3">
          <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-400 text-black">
            <Link to="/tarot">
              <Hash className="w-4 h-4 mr-2" />
              Seal this vision as a Verifiable Artifact
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to={`/lattice/loop?seed=${encodeURIComponent(seed)}`}>Walk the regal loop-hole</Link>
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Deterministic per seed · Same input always yields the same vision · Powered by QTΦ-Lattice v6
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="font-mono text-lg text-amber-100 mt-1">{value}</div>
    </div>
  );
}
