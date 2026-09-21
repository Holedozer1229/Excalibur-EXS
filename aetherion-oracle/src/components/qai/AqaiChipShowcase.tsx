/** Main-page AQAI Quantum AI superpower + Quantum Moat showcase — design / Soft Silicon only. */
import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Shield, Zap, Atom, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AqaiChipVisual } from "@/components/qai/AqaiChipVisual";
import {
  AQAI_AXIOMS,
  CAPABILITY_SCORECARD,
  QUANTUM_AI_PILLARS,
  superpowerIndex,
} from "@/lib/qai/qaiChipset";
import {
  COMPOUNDING_FLYWHEEL,
  MOAT_LAYERS,
  UNSTOPPABLE_FORCE,
  combinedMoatSuperpowerIndex,
} from "@/lib/qai/quantumMoat";

const PILLAR_ICONS = { Shield, Atom, Zap } as const;

export function AqaiChipShowcase() {
  const idx = superpowerIndex();
  const combined = combinedMoatSuperpowerIndex();
  const topAxes = CAPABILITY_SCORECARD.filter((r) => r.axis !== "Dense matmul FLOPs").slice(0, 4);

  return (
    <>
      <section id="aqai-chips" className="scroll-mt-20 border-t border-primary/15 py-20">
        <div className="relative overflow-hidden rounded-sm border border-cyan-500/20 bg-black/40 px-6 py-10 sm:px-10 sm:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-30 mix-blend-screen"
            style={{
              backgroundImage: "url(/chipset/aqai-chip-bg.png)",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80" aria-hidden />

          <div className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
            <div>
              <p className="font-tech mb-3 text-[10px] tracking-[0.32em] text-cyan-300/90">
                Quantum AI Superpower
              </p>
              <h2 className="font-saga text-2xl tracking-wider sm:text-4xl">
                The Unstoppable Force · <span className="gradient-neon-text">quantum-class</span> moat
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                Not another FLOPs race — seven compounding layers that incumbents cannot bolt on.
                EP logic, octonion ALU, NH skin memory, and seal-native compute unified by Caduceus.
                Soft Silicon ships today; die matches the binary.
              </p>

              <ul className="mt-6 space-y-2 text-xs text-muted-foreground sm:text-sm">
                {AQAI_AXIOMS.slice(0, 4).map((a) => (
                  <li key={a.id} className="flex gap-2 border-l border-cyan-500/30 pl-3">
                    <span className="font-mono text-cyan-200/80">{a.id}.</span>
                    <span><strong className="text-foreground/90">{a.name}</strong> — {a.aqai}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild size="sm" className="font-display text-[10px] uppercase tracking-widest">
                  <Link to="/chipset">
                    Run moat lab <ArrowRight className="ml-1 h-3.5 w-3.5" />
                  </Link>
                </Button>
                <Button asChild size="sm" variant="outline" className="font-display text-[10px] uppercase tracking-widest">
                  <a href="/docs/QUANTUM-MOAT.md" target="_blank" rel="noreferrer">
                    Quantum moat manifesto
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="font-display text-[10px] uppercase tracking-widest">
                  <a href="/chipset/pitch-deck.html" target="_blank" rel="noreferrer">
                    Investor deck
                  </a>
                </Button>
              </div>

              <p className="mt-4 font-mono text-[10px] text-amber-200/70">
                Combined index {combined.combinedScore} · superpower +{idx.margin} · moat {combined.moat.liveLayers}/7 live · not shipping die
              </p>
            </div>

            <div className="flex flex-col items-center gap-6">
              <AqaiChipVisual
                variant="hero"
                imageSrc="/chipset/aqai-chip-hero.png"
                className="max-w-sm lg:max-w-md"
              />
              <div className="grid w-full max-w-md grid-cols-2 gap-2 font-mono text-[10px]">
                {topAxes.map((r) => (
                  <div key={r.axis} className="rounded-sm border border-border/40 bg-background/60 px-2 py-1.5">
                    <div className="truncate text-muted-foreground">{r.axis}</div>
                    <div className="text-amber-200">AQAI {r.aqai}/10</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mt-12 grid gap-6 sm:grid-cols-3">
            {QUANTUM_AI_PILLARS.map((p, i) => {
              const Icon = PILLAR_ICONS[Object.keys(PILLAR_ICONS)[i] as keyof typeof PILLAR_ICONS];
              return (
                <div key={p.id} className="border-l-2 border-cyan-500/40 pl-4">
                  <Icon className="mb-2 h-4 w-4 text-cyan-300" />
                  <div className="font-saga text-sm tracking-wide text-foreground">{p.name}</div>
                  <div className="mt-1 text-xs font-medium text-cyan-200/90">{p.stack}</div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{p.beat}</p>
                  <p className="mt-1 font-mono text-[10px] text-amber-200/60">{p.honesty}</p>
                </div>
              );
            })}
          </div>

          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-4 border-t border-cyan-500/15 pt-6">
            <div className="flex items-center gap-2 text-[10px] font-tech tracking-[0.2em] text-muted-foreground">
              <Cpu className="h-3.5 w-3.5 text-primary" />
              AQAI-EDGE · AQAI-CLOUD · AQAI-SOVEREIGN · G0→G6
            </div>
          </div>
        </div>
      </section>

      <section id="quantum-moat" className="scroll-mt-20 border-t border-violet-500/15 py-16">
        <div className="rounded-sm border border-violet-500/25 bg-black/50 px-6 py-10 sm:px-10">
          <div className="mb-8 flex flex-wrap items-center gap-3">
            <Layers className="h-5 w-5 text-violet-300" />
            <p className="font-tech text-[10px] tracking-[0.32em] text-violet-300/90">
              The Quantum Moat
            </p>
            <Badge variant="outline" className="border-violet-400/40 text-violet-200">
              {combined.moat.liveLayers} live · {combined.moat.roadmapLayers} roadmap
            </Badge>
          </div>

          <h2 className="font-saga text-xl tracking-wider sm:text-3xl">
            Seven layers · <span className="gradient-neon-text">one unstoppable flywheel</span>
          </h2>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            {UNSTOPPABLE_FORCE.thesis}
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MOAT_LAYERS.map((layer) => (
              <div
                key={layer.id}
                className="border-l-2 border-violet-500/40 bg-background/40 pl-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-violet-200">L{layer.layer}</span>
                  <Badge
                    variant="outline"
                    className={
                      layer.status === "live"
                        ? "border-cyan-500/50 text-cyan-200 text-[9px]"
                        : "border-amber-500/40 text-amber-200/80 text-[9px]"
                    }
                  >
                    {layer.status}
                  </Badge>
                </div>
                <div className="font-saga text-sm text-foreground">{layer.name}</div>
                <div className="font-mono text-[10px] text-violet-200/80">{layer.anchor}</div>
                <p className="mt-1 text-xs text-muted-foreground">{layer.thesis}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div className="relative mx-auto aspect-square w-full max-w-xs">
              <div className="absolute inset-0 rounded-full border border-violet-500/30 animate-[spin_48s_linear_infinite]" aria-hidden />
              <div className="absolute inset-[12%] rounded-full border border-cyan-500/20 animate-[spin_36s_linear_infinite_reverse]" aria-hidden />
              <div className="absolute inset-0 flex items-center justify-center">
                <RefreshCw className="h-8 w-8 text-violet-300/60 animate-[spin_24s_linear_infinite]" />
              </div>
              {COMPOUNDING_FLYWHEEL.map((stage, i) => {
                const angle = (i / COMPOUNDING_FLYWHEEL.length) * 360 - 90;
                const rad = (angle * Math.PI) / 180;
                const r = 42;
                const x = 50 + r * Math.cos(rad);
                const y = 50 + r * Math.sin(rad);
                return (
                  <div
                    key={stage.stage}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-sm border border-violet-500/30 bg-background/90 px-1.5 py-0.5 text-center font-mono text-[8px] uppercase tracking-wider text-violet-100/90 sm:text-[9px]"
                    style={{ left: `${x}%`, top: `${y}%` }}
                    title={stage.feeds}
                  >
                    {stage.name.split(" ")[0]}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 text-sm">
              <div className="font-display text-[10px] uppercase tracking-widest text-violet-200">
                Compounding flywheel
              </div>
              <ol className="space-y-2 text-xs text-muted-foreground">
                {COMPOUNDING_FLYWHEEL.map((s, i) => (
                  <li key={s.stage} className="border-l border-violet-500/30 pl-3">
                    <span className="font-mono text-violet-200">{i + 1}.</span>{" "}
                    <strong className="text-foreground/90">{s.name}</strong> → {s.output}
                  </li>
                ))}
              </ol>
              <p className="font-mono text-[10px] text-amber-200/70">
                Architectural + compounding — not &ldquo;we already won.&rdquo; Quantum-class = EP/NH/octonion, not room-temp qubits.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild size="sm" variant="outline" className="font-display text-[10px] uppercase tracking-widest">
                  <a href="/docs/QUANTUM-MOAT.md" target="_blank" rel="noreferrer">
                    Full manifesto
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="font-display text-[10px] uppercase tracking-widest">
                  <a href="/chipset/pitch-deck.html" target="_blank" rel="noreferrer">
                    Pitch deck
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
