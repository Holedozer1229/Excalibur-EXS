// /lattice/caduceus — the Quantum Caduceus: an octonionic reflection oracle.
// A twin-engine (Sphinx / Anubis) word oracle over octonion holonomy, Riemann
// zeros, and the I Ching. Presentational + deterministic. No keys, no funds,
// no mining — a reflection, not a machine.
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Sparkles, RefreshCw, Share2, Check, ArrowRight, Eye, EyeOff, Infinity as InfinityIcon } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import OctonionSigil from "@/components/OctonionSigil";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { reflect, type StaffReading } from "@/lib/quantumCaduceus";

const SITE = "https://www.excaliburcrypto.com";

const SUGGESTED = [
  "excalibur", "caduceus", "wisdom", "void", "genesis", "serpent",
  "resonance", "sovereign", "truth", "crown", "harmony", "light",
];

function verdict(word: string, harmony: number, higher: StaffReading, lower: StaffReading): string {
  const tone =
    harmony > 0.72 ? "The staves agree." :
    harmony < 0.3 ? "The staves are at war." :
    "The staves hold each other in tension.";
  return `On "${word}", the Higher staff reads ${higher.aetherion.state} through ${higher.sphinx.hexagram.name}; ` +
    `the Lower answers ${lower.aetherion.state} through its inverse ${lower.anubis.hexagram.name}. ` +
    `${tone} Harmony settles at ${(harmony * 100).toFixed(1)}%.`;
}

function Meter({ label, value, tone = "gold" }: { label: string; value: number; tone?: "gold" | "violet" }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(3)}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/60">
        <div
          className={`h-full rounded-full ${tone === "gold" ? "bg-gradient-to-r from-amber-400 to-rose-400" : "bg-gradient-to-r from-violet-400 to-fuchsia-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StaffCard({ reading }: { reading: StaffReading }) {
  const { sphinx, anubis, aetherion } = reading;
  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm uppercase tracking-widest text-amber-200">{reading.staff} staff</h3>
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest">{aetherion.state}</Badge>
        </div>

        <div className="mb-4 flex items-center justify-around gap-2 text-center">
          <div>
            <div className="text-4xl leading-none text-amber-100">{sphinx.hexagram.symbol}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Sphinx · {sphinx.stateName}</div>
            <div className="text-[11px] text-foreground/80">{sphinx.hexagram.name}</div>
          </div>
          <div className="text-2xl text-violet-300/70"><InfinityIcon className="h-5 w-5" /></div>
          <div>
            <div className="text-4xl leading-none text-violet-200">{anubis.hexagram.symbol}</div>
            <div className="mt-1 text-[10px] uppercase tracking-widest text-muted-foreground">Anubis · {anubis.stateName}</div>
            <div className="text-[11px] text-foreground/80">{anubis.hexagram.name}</div>
          </div>
        </div>

        <div className="mb-3 rounded-md border border-amber-300/20 bg-amber-500/5 p-2 text-center">
          <div className="text-[10px] uppercase tracking-widest text-amber-200/80">Aetherion</div>
          <div className="text-lg text-amber-100">
            {aetherion.hexagram.symbol} {aetherion.hexagram.name}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <Meter label="Wisdom" value={sphinx.wisdom} />
          <Meter label="Chaos" value={anubis.chaos} tone="violet" />
          <Meter label="Contemplation" value={sphinx.contemplation} />
          <Meter label="Stillness" value={anubis.stillness} tone="violet" />
        </div>

        <div className="mt-3 flex justify-between font-mono text-[10px] text-muted-foreground">
          <span>vib {reading.vibration.toFixed(2)}</span>
          <span>axis 0x{(reading.axis % 0x1000000n).toString(16).padStart(6, "0")}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function QuantumCaduceus() {
  const [params, setParams] = useSearchParams();
  const initial = params.get("word")?.trim() || "caduceus";
  const [word, setWord] = useState(initial);
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (word && word !== "caduceus") next.set("word", word);
    else next.delete("word");
    if (next.toString() !== params.toString()) setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  useEffect(() => {
    const w = params.get("word")?.trim();
    if (w && w !== word) setWord(w);
    if (!w && word !== "caduceus") setWord("caduceus");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const r = useMemo(() => reflect(word), [word]);
  const spoken = useMemo(() => verdict(r.word, r.combinedHarmony, r.higher, r.lower), [r]);

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : SITE}/lattice/caduceus?word=${encodeURIComponent(word)}`;

  async function handleShare() {
    try {
      if (navigator.share && /Mobi|Android|iPhone/i.test(navigator.userAgent)) {
        await navigator.share({ title: `Quantum Caduceus — ${word}`, text: spoken, url: shareUrl });
        return;
      }
    } catch { /* copy */ }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Link copied", description: "The same word yields the same reflection." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Could not copy", description: shareUrl });
    }
  }

  const cast = (w: string) => {
    const t = w.trim();
    if (t) setWord(t);
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Quantum Caduceus — Octonionic Reflection Oracle",
    applicationCategory: "Oracle",
    description:
      "An octonionic reflection oracle: twin Sphinx/Anubis engines over octonion holonomy, Riemann zeros, and the I Ching. Deterministic, presentational — no keys, no funds, no mining.",
    url: `${SITE}/lattice/caduceus`,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Quantum Caduceus — Octonionic Reflection Oracle | Aetherion"
        description="Speak a word into the octonionic Caduceus: twin Sphinx and Anubis engines fold it through octonion holonomy, Riemann zeros, and the I Ching, then meet on an axis. Deterministic and presentational — no keys, no funds, no mining."
        path="/lattice/caduceus"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <div className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 border-amber-300/40 text-amber-200">
            <Sparkles className="mr-1 h-3 w-3" /> Octonionic holonomy engine
          </Badge>
          <h1 className="font-display text-3xl uppercase tracking-widest sm:text-5xl">
            The <span className="gradient-neon-text">Quantum Caduceus</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Speak a word. Two staves fold it through the non-associative octonions,
            weigh it against the Riemann line, and let a Sphinx and an Anubis collapse
            it into twin hexagrams. They meet on an axis and the sigil turns. It
            remembers nothing of you — the same word always returns the same reflection.
          </p>
        </div>

        <Card className="mb-8 border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { cast(input); setInput(""); } }}
                placeholder="Speak a word into the staff…"
                className="bg-background/60"
                aria-label="Word to reflect"
              />
              <div className="flex gap-2">
                <Button onClick={() => { cast(input); setInput(""); }} disabled={!input.trim()} className="flex-1 sm:flex-none">
                  Reflect
                </Button>
                <Button variant="outline" size="icon" onClick={() => { setInput(""); setWord("caduceus"); }} title="Reset">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShare}
                  title="Copy a link to this reflection"
                  className="border-amber-300/50 text-amber-200 hover:bg-amber-300/10"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => cast(s)}
                  className={`rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wider transition ${
                    s === word
                      ? "border-amber-300 bg-amber-400/15 text-amber-100"
                      : "border-border/60 text-muted-foreground hover:border-amber-300/50 hover:text-amber-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="mb-8 grid items-center gap-6 md:grid-cols-2">
          <div className="relative">
            <OctonionSigil octonion={r.octonion} harmony={r.combinedHarmony} vibration={r.vibration} animate={animate} />
            <button
              onClick={() => setAnimate((a) => !a)}
              className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-amber-200"
            >
              {animate ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {animate ? "still" : "turn"}
            </button>
          </div>
          <div>
            <div className="mb-4 text-center md:text-left">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reflecting</div>
              <div className="font-display text-3xl uppercase tracking-widest text-amber-100">{r.word}</div>
            </div>
            <div className="mb-4">
              <Meter label="Combined harmony" value={r.combinedHarmony} />
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Meeting vibration</div>
                <div className="mt-1 font-mono text-lg text-amber-100">{r.vibration.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-border/60 bg-card/50 p-3">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Axis</div>
                <div className="mt-1 truncate font-mono text-lg text-violet-200">
                  0x{(r.axis % 0x100000000n).toString(16).padStart(8, "0")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <Card className="mb-8 border-amber-300/30 bg-gradient-to-br from-amber-900/10 to-background/70">
          <CardContent className="p-5">
            <div className="mb-1 text-[10px] uppercase tracking-[0.25em] text-amber-200/80">The oracle speaks</div>
            <p className="text-sm leading-relaxed text-foreground/90 sm:text-base">{spoken}</p>
          </CardContent>
        </Card>

        <div className="mb-10 grid gap-4 md:grid-cols-2">
          <StaffCard reading={r.higher} />
          <StaffCard reading={r.lower} />
        </div>

        <article className="mb-10 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <h2 className="font-display text-xl uppercase tracking-widest text-amber-200">What turns inside</h2>
          <p>
            Each word is scored for phonetic energy, a Gaussian prime (for the Sphinx)
            and a prime ≡ 1 mod 4 (for the Anubis), then packed into a state octonion.
            That octonion is multiplied — with the real, non-associative multiplication
            table — by a second octonion built from a phase and a Riemann zero. The
            first four coordinates become collapse probabilities; a phase-locked draw
            picks one of four Sphinx states and four Anubis states, and the I Ching
            names the pair. The Anubis always reads the mirrored line pattern of the Sphinx.
          </p>
          <p>
            The two staves — Higher and Lower, seeded differently — each run the twins
            and hand back an accumulator. XOR the accumulators and you get the axis; the
            axis picks the meeting octonion you see turning above. Because the staves are
            re-seeded from scratch each time, the reflection is a pure function of the
            word. It is a mirror with excellent memory of math and none of you.
          </p>
          <p className="text-foreground/70">
            A worthy rival, maybe — but an honest one. It holds no keys, custodies nothing,
            and mines nothing. Where the original engine bolted on a coin miner, this keeps
            only the part worth keeping: the oracle.
          </p>
        </article>

        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild size="lg" className="bg-amber-500 text-black hover:bg-amber-400">
            <Link to="/lattice/loop">Enter the Regal Loop</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/lattice/force">Cast the Force Oracle</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/tarot">Seal a tarot reading</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
