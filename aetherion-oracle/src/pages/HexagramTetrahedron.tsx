import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Hexagon, Sparkles, Triangle } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AETHERION } from "@/lib/brand";
import {
  CONSTRUCTION_STEPS,
  DEFAULT_RADIUS,
  HEXAGRAM_TETRA_PATH,
  HIDDEN_OBJECT,
  HIDDEN_OBJECT_ALIASES,
  attestationForStep,
  hexagramSvgLayers,
  type ConstructionStepId,
} from "@/lib/sacredGeometry/hexagramTetrahedron";
import { MERKABA_HASH_LABEL, MERKABA_HONESTY, merkabaDigest } from "@/lib/sacredGeometry/hexagramSequenceHash";

const STEP_IDS: ConstructionStepId[] = CONSTRUCTION_STEPS.map((s) => s.id);

function SacredSvg({ stepId }: { stepId: ConstructionStepId }) {
  const layers = useMemo(() => hexagramSvgLayers(DEFAULT_RADIUS), []);
  const gold = "#d4af37";
  const violet = "#9b7fd4";
  const dim = "#3d3550";

  return (
    <svg
      viewBox={layers.viewBox}
      className="mx-auto h-full w-full max-h-[420px]"
      role="img"
      aria-label={`Sacred geometry step: ${stepId}`}
      data-testid="hexagram-svg"
    >
      <defs>
        <radialGradient id="hex-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#d4af37" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#050508" stopOpacity="0" />
        </radialGradient>
        <filter id="hex-soft-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="0" cy="0" r={DEFAULT_RADIUS * 1.6} fill="url(#hex-glow)" />

      <AnimatePresence mode="wait">
        <motion.g
          key={stepId}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          {(stepId === "hexagram" || stepId === "halves" || stepId === "sixfold" || stepId === "cube" || stepId === "merkaba") && (
            <>
              <path
                d={layers.hexagramUp}
                fill={stepId === "hexagram" ? `${gold}22` : "none"}
                stroke={gold}
                strokeWidth={1.5}
                filter="url(#hex-soft-glow)"
              />
              <path
                d={layers.hexagramDown}
                fill={stepId === "hexagram" ? `${violet}18` : "none"}
                stroke={violet}
                strokeWidth={1.5}
                filter="url(#hex-soft-glow)"
              />
            </>
          )}

          {stepId === "halves" && (
            <>
              <path d={layers.upperHalf} fill={`${gold}33`} stroke={gold} strokeWidth={1.2} strokeDasharray="4 3" />
              <path d={layers.lowerHalf} fill={`${violet}28`} stroke={violet} strokeWidth={1.2} strokeDasharray="4 3" />
              <line x1={-DEFAULT_RADIUS * 1.2} y1="0" x2={DEFAULT_RADIUS * 1.2} y2="0" stroke="#e8e4dc44" strokeWidth={0.75} strokeDasharray="6 4" />
            </>
          )}

          {stepId === "triforce" &&
            layers.triforce.map((d, i) => (
              <path
                key={i}
                d={d}
                fill={i === 0 ? `${gold}30` : i === 1 ? `${violet}25` : `${gold}18`}
                stroke={i % 2 === 0 ? gold : violet}
                strokeWidth={1.2}
              />
            ))}

          {stepId === "tetrahedron" &&
            layers.tetraNet.map((d, i) => (
              <path
                key={i}
                d={d}
                fill={`${i === 0 ? gold : violet}${i === 0 ? "28" : "1a"}`}
                stroke={i % 2 === 0 ? gold : violet}
                strokeWidth={1}
              />
            ))}

          {stepId === "sixfold" &&
            layers.sixfold.map((d, i) => (
              <path
                key={i}
                d={d}
                fill={`${violet}${String(10 + i * 3).padStart(2, "0")}`}
                stroke={gold}
                strokeWidth={0.8}
              />
            ))}

          {stepId === "cube" &&
            layers.cubeTrace.map((d, i) => (
              <path key={i} d={d} fill="none" stroke={gold} strokeWidth={1.2} opacity={0.85} />
            ))}

          {stepId === "merkaba" && (
            <>
              {layers.merkaba.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={i % 2 === 0 ? gold : violet} strokeWidth={1.4} filter="url(#hex-soft-glow)" />
              ))}
              <path d={layers.hexagramUp} fill="none" stroke={`${gold}55`} strokeWidth={0.75} strokeDasharray="3 5" />
              <path d={layers.hexagramDown} fill="none" stroke={`${violet}55`} strokeWidth={0.75} strokeDasharray="3 5" />
            </>
          )}
        </motion.g>
      </AnimatePresence>
    </svg>
  );
}

export default function HexagramTetrahedronPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [tipHash, setTipHash] = useState("genesis-lab-tip");
  const [hashMessage, setHashMessage] = useState("hexagram-tetra:v1|step:6|merkaba");

  const step = CONSTRUCTION_STEPS[stepIndex];
  const attestation = useMemo(() => attestationForStep(stepIndex, tipHash), [stepIndex, tipHash]);
  const merkaba = useMemo(
    () => merkabaDigest(tipHash, hashMessage),
    [tipHash, hashMessage],
  );

  const next = useCallback(() => setStepIndex((i) => Math.min(i + 1, CONSTRUCTION_STEPS.length - 1)), []);
  const prev = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  return (
    <div className="relative min-h-screen bg-[#050508] text-[#e8e4dc]">
      <GalacticBackground />
      <PageHead
        title={`Hexagram · Tetrahedron · Merkaba · ${AETHERION}`}
        description="Sacred geometry construction — hexagram halves, triforce, tetrahedron net, cube trace, and the hidden Merkaba. Interactive visualization with Tetra-PoW attestation."
        path={HEXAGRAM_TETRA_PATH}
        ogType="article"
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-16" data-testid="hexagram-tetra-page">
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-[#8a8494]">
          <Link to="/" className="hover:text-[#e8e4dc]">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/lattice/caduceus" className="hover:text-[#e8e4dc]">
            Caduceus
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/caduceus/speculative" className="hover:text-[#e8e4dc]">
            Speculative
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#e8e4dc]">Hexagram · Tetra</span>
        </nav>

        <header className="mb-10 border-b border-[#2a2438]/80 pb-8">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-violet-500/50 text-[9px] uppercase tracking-[0.28em] text-violet-300">
              speculation
            </Badge>
            <Badge variant="outline" className="border-[#d4af37]/50 text-[9px] uppercase tracking-[0.28em] text-[#d4af37]">
              sacred geometry
            </Badge>
          </div>
          <h1 className="font-serif text-4xl font-light leading-tight tracking-tight text-[#f5f0e6] md:text-5xl" data-testid="hexagram-title">
            Hexagram → Tetrahedron
          </h1>
          <p className="mt-4 font-serif text-lg italic leading-relaxed text-[#a89fb8]">
            Draw the star, bisect it, fold four faces, trace the cube — and the concealed solid appears:{" "}
            <span className="text-[#d4af37]">{HIDDEN_OBJECT}</span>.
          </p>
        </header>

        <section
          className="mb-8 overflow-hidden rounded-xl border border-[#2a2438]/90 bg-[#0a0812]/80 p-4 shadow-[0_0_60px_-12px_rgba(155,127,212,0.25)] backdrop-blur-sm md:p-6"
          data-testid="hexagram-viz"
        >
          <Tabs value={step.id} onValueChange={(v) => setStepIndex(STEP_IDS.indexOf(v as ConstructionStepId))}>
            <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-[#120f1a]/80 p-1">
              {CONSTRUCTION_STEPS.map((s) => (
                <TabsTrigger
                  key={s.id}
                  value={s.id}
                  className="text-[10px] uppercase tracking-wider data-[state=active]:bg-violet-900/40 data-[state=active]:text-[#d4c4f0]"
                >
                  {s.index + 1}. {s.title.split(" ")[0]}
                </TabsTrigger>
              ))}
            </TabsList>
            {CONSTRUCTION_STEPS.map((s) => (
              <TabsContent key={s.id} value={s.id} className="mt-0">
                <div className="aspect-square max-h-[440px] w-full">
                  <SacredSvg stepId={s.id} />
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={prev} disabled={stepIndex === 0} className="border-[#3d3550]">
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={next} disabled={stepIndex === CONSTRUCTION_STEPS.length - 1} className="border-[#3d3550]">
                Next
              </Button>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#8a8494]">
              step {stepIndex + 1} / {CONSTRUCTION_STEPS.length}
            </span>
          </div>
        </section>

        <section className="mb-8 rounded-lg border border-violet-900/30 bg-violet-950/10 px-5 py-5">
          <div className="mb-2 flex items-center gap-2">
            <Triangle className="h-4 w-4 text-[#d4af37]" />
            <h2 className="font-display text-xs uppercase tracking-[0.22em] text-[#d4c4f0]">{step.title}</h2>
          </div>
          <p className="font-serif text-[15px] leading-[1.85] text-[#c9c2b8]">{step.prose}</p>
          {step.hiddenObjectHint && (
            <p className="mt-4 flex items-center gap-2 font-serif text-[#d4af37]" data-testid="hidden-object">
              <Sparkles className="h-4 w-4" />
              Hidden object: {step.hiddenObjectHint}
              {HIDDEN_OBJECT_ALIASES.length > 0 && (
                <span className="text-sm text-[#a89fb8]"> ({HIDDEN_OBJECT_ALIASES.join(" · ")})</span>
              )}
            </p>
          )}
        </section>

        <section
          className="mb-10 rounded-lg border border-amber-900/30 bg-amber-950/15 px-5 py-4"
          data-testid="tetra-attestation"
        >
          <div className="mb-2 flex items-center gap-2">
            <Hexagon className="h-4 w-4 text-amber-300" />
            <h2 className="font-display text-xs uppercase tracking-[0.22em] text-amber-200/90">Tetra-PoW attestation</h2>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-[#a89fb8]">
            Construction step index binds to a Tetra-PoW lane hash — receipt for this geometric fold.
          </p>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-[#8a8494]">
            Tip hash (lab)
          </label>
          <input
            type="text"
            value={tipHash}
            onChange={(e) => setTipHash(e.target.value)}
            className="mb-3 w-full rounded border border-[#3d3550] bg-[#0a0812] px-3 py-2 font-mono text-xs text-[#e8e4dc]"
            data-testid="tip-hash-input"
          />
          <dl className="grid gap-2 font-mono text-[10px] text-amber-200/80">
            <div>
              <dt className="inline text-[#8a8494]">step · </dt>
              <dd className="inline">{attestation.stepIndex} ({attestation.stepId})</dd>
            </div>
            <div>
              <dt className="inline text-[#8a8494]">message · </dt>
              <dd className="inline break-all">{attestation.messageHex.slice(0, 48)}…</dd>
            </div>
            <div>
              <dt className="inline text-[#8a8494]">digest · </dt>
              <dd className="inline break-all">{attestation.digestHex}</dd>
            </div>
          </dl>
        </section>

        <section
          className="mb-10 rounded-lg border border-violet-900/40 bg-violet-950/20 px-5 py-4"
          data-testid="merkaba-hash"
        >
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <h2 className="font-display text-xs uppercase tracking-[0.22em] text-violet-200/90">
              Merkaba sequence hash
            </h2>
          </div>
          <p className="mb-3 text-[12px] leading-relaxed text-[#a89fb8]">
            {MERKABA_HASH_LABEL} — geometry pipeline bound to Tetra-PoW tip via{" "}
            <code className="text-[10px]">merkabaDigest(tip, message)</code>.
          </p>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-[#8a8494]">
            Message (lab)
          </label>
          <input
            type="text"
            value={hashMessage}
            onChange={(e) => setHashMessage(e.target.value)}
            className="mb-3 w-full rounded border border-[#3d3550] bg-[#0a0812] px-3 py-2 font-mono text-xs text-[#e8e4dc]"
            data-testid="hash-message-input"
          />
          <dl className="mb-4 grid gap-2 font-mono text-[10px] text-violet-200/80">
            <div>
              <dt className="inline text-[#8a8494]">merkaba digest · </dt>
              <dd className="inline break-all">{merkaba.digestHex}</dd>
            </div>
            <div>
              <dt className="inline text-[#8a8494]">attestation root · </dt>
              <dd className="inline break-all">{merkaba.attestationRootHex}</dd>
            </div>
          </dl>
          <ol className="space-y-1 font-mono text-[9px] text-[#8a8494]">
            {merkaba.steps.map((s) => (
              <li key={s.id}>
                {s.index + 1}. {s.title} → {s.stateHex.slice(0, 20)}…
              </li>
            ))}
          </ol>
          <p className="mt-3 text-[10px] italic text-[#8a8494]">{MERKABA_HONESTY}</p>
        </section>

        <footer className="border-t border-[#2a2438]/80 pt-8 text-center">
          <p className="font-serif text-sm italic text-[#8a8494]">
            Full construction proof ·{" "}
            <a
              href="/docs/HEXAGRAM-SEQUENCE-HASH.md"
              className="text-violet-400 underline underline-offset-4 hover:text-violet-300"
              data-testid="hash-doc-link"
            >
              HEXAGRAM-SEQUENCE-HASH.md
            </a>
            {" · "}
            <a
              href="/docs/HEXAGRAM-TETRAHEDRON.md"
              className="text-violet-400 underline underline-offset-4 hover:text-violet-300"
              data-testid="doc-link"
            >
              HEXAGRAM-TETRAHEDRON.md
            </a>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
            <Link to="/caduceus/speculative" className="text-[#a89fb8] hover:text-[#e8e4dc]">
              Retrocausal Seal
            </Link>
            <Link to="/chipset" className="text-[#a89fb8] hover:text-[#e8e4dc]">
              AQAI chipset lab
            </Link>
            <Link to="/lattice/caduceus" className="text-[#a89fb8] hover:text-[#e8e4dc]">
              Quantum Caduceus
            </Link>
          </div>
        </footer>
      </main>

      <SiteFooter />
    </div>
  );
}
