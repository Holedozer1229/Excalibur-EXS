// /chipset — AETHERION QAI: Caduceus-powered paradigm chipset lab.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Cpu, Play, ArrowRight, Crown } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AqaiChipVisual } from "@/components/qai/AqaiChipVisual";
import { AetherionLogo } from "@/components/brand/AetherionLogo";
import {
  AQAI_AXIOMS,
  AQAI_OPCODES,
  AQAI_PARTS,
  AQAI_SKUS,
  CAPABILITY_SCORECARD,
  DOMINATION_PHASES,
  MARKET_DOMINANCE,
  QUANTUM_AI_PILLARS,
  SAMPLE_PROGRAM,
  WORLD_DOMINANCE_THESIS,
  braid,
  decodeInstr,
  epScan,
  pomStep,
  sealDigest,
  skinLocalize,
  sphinxFold,
  superpowerIndex,
} from "@/lib/qai/qaiChipset";
import {
  CAPITAL_OPTIONS,
  CAPITAL_VERDICT,
  GRANT_TARGETS,
  INVESTOR_SEGMENTS,
  MANUFACTURING_GATES,
  OUTREACH_SEQUENCE,
  fundingSummaryLines,
  superpowerThesisLines,
} from "@/lib/qai/fundingPlaybook";
import {
  G2_SEAL_DEMO,
  getGateDetail,
  getGatesG1G3,
} from "@/lib/qai/gateProgress";
import {
  KILL_SCENARIOS,
  MOAT_LAYERS,
  UNSTOPPABLE_FORCE,
  combinedMoatSuperpowerIndex,
  compoundingFlywheelTraceLines,
  quantumMoatTraceLines,
  unstoppableForceTraceLines,
} from "@/lib/qai/quantumMoat";
import {
  COSMOLOGY_AXIOM_LINES,
  SPECULATION_DISCLAIMER,
  buildRetrocausalSeal,
} from "@/lib/retrocausalSeal";
import { unitySealTraceLines } from "@/lib/qai/unitySeal";
import { unityChipFuseTraceLines } from "@/lib/qai/unityChipFuse";
import { physicalDesignTraceLines } from "@/lib/qai/physicalDesign";
import { caduceusSchnorrTraceLines } from "@/lib/qai/caduceusSchnorr";
import { posEvidenceTraceLines, type PosEvidence } from "@/lib/qai/posEvidence";
import { merkabaHashTraceLines } from "@/lib/sacredGeometry/hexagramSequenceHash";
import { unityFieldTraceLines } from "@/lib/qai/unityField";
import { temporalWormholeTraceLines } from "@/lib/qai/temporalWormholeTraversal";

type LabFocus =
  | "superpower"
  | "moat"
  | "unstoppable"
  | "flywheel"
  | "moatindex"
  | "paradigm"
  | "market"
  | "score"
  | "skus"
  | "phases"
  | "capital"
  | "mfg"
  | "g1"
  | "g2"
  | "g3"
  | "g2fpga"
  | "investors"
  | "grants"
  | "family"
  | "isa"
  | "asm"
  | "skin"
  | "ep"
  | "seal"
  | "pom"
  | "bios"
  | "profound"
  | "unity"
  | "chipfuse"
  | "physicaldesign"
  | "schnorr"
  | "posevidence"
  | "merkaba"
  | "unityfield"
  | "temporalwormhole";

const RUNS: { id: LabFocus; label: string; hint: string }[] = [
  { id: "superpower", label: "Run superpower thesis", hint: "Three pillars · world map · honesty rails" },
  { id: "moat", label: "Run quantum moat", hint: "Seven layers · caduceus.seal.v1 · live vs roadmap" },
  { id: "unstoppable", label: "Run unstoppable force", hint: "Thesis · checklist · honesty rails" },
  { id: "flywheel", label: "Run compounding flywheel", hint: "Adopt → prove → freeze → silicon → compound" },
  { id: "moatindex", label: "Run moat + superpower index", hint: "Combined category + moat score" },
  { id: "paradigm", label: "Run 8 axioms", hint: "Why AQAI owns the class" },
  { id: "market", label: "Run market kill-map", hint: "GPU · TPU · neuro · annealer" },
  { id: "score", label: "Run superpower index", hint: "Category axes — not FLOPs" },
  { id: "skus", label: "Run product SKUs", hint: "EDGE · CLOUD · SOVEREIGN" },
  { id: "phases", label: "Run Soft→Hard roadmap", hint: "Ship Caduceus API today" },
  { id: "capital", label: "Run capital verdict", hint: "Fabless · grants · angels · MPW" },
  { id: "mfg", label: "Run manufacturing gates", hint: "G0 Soft Silicon → G6 scale" },
  { id: "g1", label: "Run G1 entity pack", hint: "Corp · SAFE · EAR · SAM.gov" },
  { id: "g2", label: "Run G2 FPGA pack", hint: "Artix-7 · seal round-trip" },
  { id: "g2fpga", label: "Run G2 FPGA status", hint: "Sim metrics · board blocked" },
  { id: "g3", label: "Run G3 foundry pack", hint: "PDK · MPW · OSAT · DRC" },
  { id: "investors", label: "Run investor map", hint: "Angels · seed · corporate" },
  { id: "grants", label: "Run grants pipeline", hint: "NSF SBIR · DOE · CHIPS" },
  { id: "family", label: "Run chipset family", hint: "CORE-Ω · SKIN · EPX · IOC" },
  { id: "isa", label: "Run paradigm ISA", hint: "OCT · SKIN · EP · SPHINX · SEAL" },
  { id: "asm", label: "Run boot.asm decode", hint: "Full paradigm program" },
  { id: "skin", label: "Run skin memory", hint: "Hatano–Nelson edge pile-up" },
  { id: "ep", label: "Run EP scan", hint: "PT unbroken → broken" },
  { id: "seal", label: "Run seal + SphinxFold", hint: "Proof + Soft Silicon hash" },
  { id: "pom", label: "Run Proof-of-Memory", hint: "Retention as compute cost" },
  { id: "bios", label: "Run BIOS map", hint: "Caduceus POST · phase lock" },
  { id: "profound", label: "Run speculative profound", hint: "8 axioms as cosmology · retrocausal seal" },
  { id: "unity", label: "Run unity seal f(x)=cos(0), x=1", hint: "cos(0)=1 · f(1)=1 · unity digest" },
  { id: "chipfuse", label: "Run unity chip fuse", hint: "ISA + RTL trace · X₀(348) newforms · seal_ioc" },
  { id: "physicaldesign", label: "Run physical design", hint: "Full block inventory + floorplan summary · everything on die" },
  { id: "schnorr", label: "Run Caduceus Schnorr", hint: "CryptoX z Tetra · BIP340 · batch · MuSig · Taproot" },
  { id: "posevidence", label: "Run PoS evidence cross-ref", hint: "Tetra-PoW tip → CREATE2 → 137 ETH proof ledger (not spendable L1)" },
  { id: "merkaba", label: "Run Merkaba hash", hint: "Hexagram sequence → Merkaba seal · Caduceus attestation digest" },
  { id: "unityfield", label: "Run unity field equation", hint: "4/3 · 75/17 · field(v,u) · C=1=x · mathematical lab" },
  { id: "temporalwormhole", label: "Run temporal wormhole traversal", hint: "Δt phase · Merkaba fold/unfold · EPR ledger · C=1=x anchor · geometric lab" },
];

export default function QaiChipset() {
  const [focus, setFocus] = useState<LabFocus | null>("superpower");
  const [trace, setTrace] = useState<string[]>([]);
  const [skin, setSkin] = useState<number[] | null>(null);

  const program = useMemo(
    () => SAMPLE_PROGRAM.map((s) => ({ label: s.label, word: s.word(), dec: decodeInstr(s.word()) })),
    [],
  );

  const run = async (id: LabFocus) => {
    setFocus(id);
    setSkin(null);
    if (id === "asm") {
      setTrace(
        program.map(
          (p) =>
            `0x${p.word.toString(16).padStart(8, "0")}  ${p.dec.mnem.padEnd(12)} rd=r${p.dec.rd} rs1=r${p.dec.rs1} rs2=r${p.dec.rs2}`,
        ),
      );
      return;
    }
    if (id === "score") {
      const d = superpowerIndex();
      setTrace(d.lines);
      return;
    }
    if (id === "superpower") {
      setTrace(superpowerThesisLines());
      return;
    }
    if (id === "moat") {
      setTrace(quantumMoatTraceLines());
      return;
    }
    if (id === "unstoppable") {
      setTrace(unstoppableForceTraceLines());
      return;
    }
    if (id === "flywheel") {
      setTrace(compoundingFlywheelTraceLines());
      return;
    }
    if (id === "moatindex") {
      setTrace(combinedMoatSuperpowerIndex().lines);
      return;
    }
    if (id === "capital") {
      setTrace([
        ...fundingSummaryLines(),
        ...CAPITAL_OPTIONS.map((o) => `#${o.rank} ${o.name} · ${o.capex} · ${o.fit}`),
        ...OUTREACH_SEQUENCE.map((s, i) => `outreach ${i + 1}. ${s}`),
      ]);
      return;
    }
    if (id === "g1" || id === "g2" || id === "g3") {
      const gateId = id.toUpperCase() as "G1" | "G2" | "G3";
      const g = getGateDetail(gateId);
      setTrace([
        `${g.id} ${g.name} [${g.status}] ${g.progressPct}%`,
        `exit: ${g.exit}`,
        ...(g.honestyNote ? [`note: ${g.honestyNote}`] : []),
        ...g.parameters.map((p) => `· ${p.label} [${p.status}] → ${p.evidence ?? "—"}`),
      ]);
      return;
    }
    if (id === "g2fpga") {
      setTrace([
        "G2 FPGA STATUS — honest report",
        `board:    ${G2_SEAL_DEMO.board}`,
        `family:   ${G2_SEAL_DEMO.fpgaFamily}`,
        `mode:     ${G2_SEAL_DEMO.mode}`,
        `cycles:   ${G2_SEAL_DEMO.totalCycles} (${G2_SEAL_DEMO.latencyNs} ns @ 100 MHz)`,
        `digest:   match=${G2_SEAL_DEMO.digestMatch}`,
        `note:     ${G2_SEAL_DEMO.honesty}`,
        "pack:     hardware/aetherion-qai/gates/G2/",
        "script:   gates/G2/scripts/fpga-seal-demo.sh",
      ]);
      return;
    }
    if (id === "skin") {
      const prof = skinLocalize(24, 1.5, 0.5);
      setSkin(prof);
      setTrace([
        "CAD.SKIN — Hatano–Nelson OBC localization (t_R=1.5, t_L=0.5)",
        `edge mass @ site 23: ${(prof[23] * 100).toFixed(1)}%`,
        "Topology predicts hierarchy — no associative cache tax.",
      ]);
      return;
    }
    if (id === "ep") {
      const lines: string[] = ["CAD.EP — PT dimer scan κ=1.0"];
      for (let g = 0; g <= 20; g++) {
        const gamma = g / 10;
        const s = epScan(gamma, 1);
        lines.push(
          `γ=${gamma.toFixed(1)}  ${s.ptBroken ? "PT-BROKEN" : "PT-unbroken"}  E+=${s.ePlus.re.toFixed(3)}+${s.ePlus.im.toFixed(3)}i${s.atEp ? "  ★ EP" : ""}`,
        );
      }
      setTrace(lines);
      return;
    }
    if (id === "seal") {
      const words = program.map((p) => p.word.toString(16)).join(":");
      const dig = await sealDigest(`aqai-paradigm:${words}`);
      const b = braid(BigInt("0xcafebab000000001"), BigInt("0xdeadbeef00000002"));
      const fold = sphinxFold(BigInt("0xaether10n0000033"), b);
      setTrace([
        "CAD.SEAL + CAD.SPHINX — Soft Silicon continuity",
        `braid probe = 0x${b.toString(16)}`,
        `sphinx fold = 0x${fold.toString(16)}`,
        `sha-256     = ${dig}`,
        "GPU cannot emit this. AQAI does — axioms 1 · 8.",
      ]);
      return;
    }
    if (id === "pom") {
      let s = BigInt("0xAETHER10N0000033");
      const lines = ["CAD.POM — Proof-of-Memory epoch walk"];
      for (let e = 0; e < 8; e++) {
        s = pomStep(s, e);
        lines.push(`epoch ${e}  memorial=${s.toString(16).padStart(16, "0")}`);
      }
      setTrace(lines);
      return;
    }
    if (id === "profound") {
      const demo = buildRetrocausalSeal("what binds the future verifier?", {
        timestamp: new Date().toISOString(),
        entropy: "chipset-lab-speculative",
      });
      setTrace([
        "MIDNIGHT ORACLE — speculation, not physics",
        SPECULATION_DISCLAIMER,
        "",
        ...COSMOLOGY_AXIOM_LINES,
        "",
        `demo seal · ${demo.seal.slice(0, 32)}…`,
        `sphinx · ${demo.caduceus.sphinx} · anubis · ${demo.caduceus.anubis}`,
        `interpretation · ${demo.interpretation.axiom}`,
        "",
        "full lab → /caduceus/speculative",
        "manifesto → /docs/SPECULATIVE-PROFOUND.md",
        "",
        "We might be wrong about all of this. The seal still holds.",
      ]);
      return;
    }
    if (id === "unity") {
      setTrace(await unitySealTraceLines("aqai-chipset-lab"));
      return;
    }
    if (id === "chipfuse") {
      setTrace(await unityChipFuseTraceLines("aqai-chipset-lab"));
      return;
    }
    if (id === "physicaldesign") {
      setTrace(physicalDesignTraceLines());
      return;
    }
    if (id === "schnorr") {
      setTrace(await caduceusSchnorrTraceLines("aqai-chipset-lab"));
      return;
    }
    if (id === "posevidence") {
      try {
        const res = await fetch("/treasure/pos-evidence.json");
        if (res.ok) {
          const evidence = (await res.json()) as PosEvidence;
          setTrace(posEvidenceTraceLines(evidence));
          return;
        }
      } catch {
        /* fall through */
      }
      setTrace([
        "PoS EVIDENCE — artifact missing",
        "Run: npm run pos:evidence",
        "137 ETH is proof-ledger / SKYNT only — NOT spendable L1 ETH.",
        "No PoS block mined without funded operator gas.",
      ]);
      return;
    }
    if (id === "merkaba") {
      setTrace(merkabaHashTraceLines("0000000000000000000000000000000000000000000000000000000000000000", "aqai-chipset-lab"));
      return;
    }
    if (id === "unityfield") {
      setTrace(unityFieldTraceLines());
      return;
    }
    if (id === "temporalwormhole") {
      setTrace(temporalWormholeTraceLines("aqai-chipset-lab"));
      return;
    }
    setTrace([]);
  };

  return (
    <div data-testid="qai-chipset-lab" className="relative min-h-screen text-foreground">
      <GalacticBackground mode="lite" />
      <div
        className="pointer-events-none fixed inset-0 -z-[5] opacity-20 mix-blend-screen"
        style={{
          backgroundImage: "url(/chipset/aqai-chip-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-hidden
      />
      <PageHead
        title="AETHERION QAI — Quantum AI Superpower Lab"
        description="Quantum-class Verified Cognition: EP, NH lattice, octonion ALU + Caduceus seal-native compute. Superpower index, three pillars, Soft→Hard G0–G6. Design lab — not fabricated die."
        path="/chipset"
        image={`${import.meta.env.VITE_SITE_URL ?? "https://www.excaliburcrypto.com"}/og-aetherion-logo.jpg`}
        imageAlt="Aetherion — Quantum AI · Caduceus"
      />
      <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">QAI chipset</span>
        </nav>

        <p className="mb-6 rounded-md border border-amber-700/30 bg-amber-950/20 px-4 py-3 text-sm text-muted-foreground">
          L1 release gate: deploy{" "}
          <code className="text-xs">SphinxBootyBridge</code> from your wallet, then run{" "}
          <code className="text-xs">claimStarkProof</code> (value 0).{" "}
          <Link to="/bridge/booty" className="font-medium text-amber-200 underline underline-offset-2">
            Bridge auto-deploy →
          </Link>
        </p>

        <header className="mb-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="text-center lg:text-left">
              <Badge variant="outline" className="mb-3 border-amber-400/50 text-amber-200">
                <Crown className="mr-1 h-3 w-3" /> Quantum AI superpower · Soft Silicon G0 live
              </Badge>
              <h1 className="font-display text-3xl uppercase tracking-widest sm:text-5xl">
                AETHERION <span className="gradient-neon-text">QAI</span>
              </h1>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base lg:mx-0">
                Verified Cognition + quantum-class physics + Caduceus control plane.
                Three pillars. Superpower index. Soft Silicon ships today; die matches the binary.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 lg:justify-start">
                <Button asChild size="sm" variant="outline">
                  <a href="/docs/QUANTUM-MOAT.md" target="_blank" rel="noreferrer">Quantum moat</a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="/docs/AETHERION-QUANTUM-AI-SUPERPOWER.md" target="_blank" rel="noreferrer">Superpower</a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a href="/chipset/pitch-deck.html" target="_blank" rel="noreferrer">Investor deck</a>
                </Button>
              </div>
            </div>
            <div className="mx-auto grid max-w-lg grid-cols-2 gap-3 lg:max-w-none">
              <AetherionLogo variant="aqai" size="lg" halo className="col-span-2 mx-auto max-w-[11rem] sm:max-w-[13rem]" />
              <AqaiChipVisual variant="hero" imageSrc="/chipset/aqai-chip-hero.png" className="max-w-[11rem] sm:max-w-[13rem]" />
              <AqaiChipVisual variant="edge" imageSrc="/chipset/aqai-chip-edge.png" className="max-w-[11rem] sm:max-w-[13rem]" />
            </div>
          </div>
        </header>

        <div className="mb-8 grid gap-2 sm:grid-cols-2">
          {RUNS.map((r) => (
            <Button
              key={r.id}
              type="button"
              variant={focus === r.id ? "default" : "outline"}
              className="h-auto flex-col items-start gap-0.5 px-4 py-3 text-left font-display"
              onClick={() => void run(r.id)}
            >
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest">
                <Play className="h-3.5 w-3.5" />
                {r.label}
              </span>
              <span className="text-[10px] font-mono font-normal normal-case tracking-normal text-muted-foreground">
                {r.hint}
              </span>
            </Button>
          ))}
        </div>

        {(focus === "moat" || focus === "unstoppable" || focus === "flywheel" || focus === "moatindex") && (
          <section className="mb-8 space-y-4 border border-violet-500/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-violet-200">
              Quantum moat · seven layers
            </h2>
            <p className="text-sm text-muted-foreground">{UNSTOPPABLE_FORCE.tagline}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {MOAT_LAYERS.map((l) => (
                <div key={l.id} className="border-l-2 border-violet-500/40 pl-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-violet-200">L{l.layer}</span>
                    <Badge
                      variant="outline"
                      className={
                        l.status === "live"
                          ? "border-cyan-500/50 text-cyan-200 text-[9px]"
                          : "border-amber-500/40 text-amber-200/80 text-[9px]"
                      }
                    >
                      {l.status}
                    </Badge>
                  </div>
                  <div className="font-saga text-foreground">{l.name}</div>
                  <div className="text-[10px] font-mono text-muted-foreground">{l.anchor}</div>
                </div>
              ))}
            </div>
            {focus === "moatindex" && (
              <p className="font-mono text-[11px] text-amber-200/80">
                Combined index {combinedMoatSuperpowerIndex().combinedScore} · superpower margin +
                {combinedMoatSuperpowerIndex().superpower.margin} · moat{" "}
                {combinedMoatSuperpowerIndex().moat.liveScore}/{combinedMoatSuperpowerIndex().moat.maxScore}
              </p>
            )}
            <div className="text-[11px] text-muted-foreground">
              Kill scenarios (honest): {KILL_SCENARIOS.map((k) => k.id).join(" · ")}
            </div>
            <Button asChild size="sm" variant="outline">
              <a href="/docs/QUANTUM-MOAT.md" target="_blank" rel="noreferrer">
                Full manifesto <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </section>
        )}

        {focus === "superpower" && (
          <section className="mb-8 space-y-4 border border-violet-500/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-violet-200">
              Quantum AI superpower thesis
            </h2>
            <p className="text-sm text-muted-foreground">{WORLD_DOMINANCE_THESIS.tagline}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              {QUANTUM_AI_PILLARS.map((p) => (
                <div key={p.id} className="border-l-2 border-violet-500/40 pl-3 text-sm">
                  <div className="font-saga text-foreground">{p.name}</div>
                  <div className="text-xs text-cyan-200/90">{p.stack}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.beat}</p>
                </div>
              ))}
            </div>
            <div>
              <div className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">World map · G0→G6</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {WORLD_DOMINANCE_THESIS.gates.map((g) => (
                  <span key={g} className="rounded-sm border border-border/50 px-2 py-0.5 font-mono text-[10px] text-amber-200/80">{g}</span>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-amber-200/70">
              {WORLD_DOMINANCE_THESIS.honestyRails.join(" · ")}
            </p>
            <Button asChild size="sm" variant="outline">
              <a href="/docs/AETHERION-QUANTUM-AI-SUPERPOWER.md" target="_blank" rel="noreferrer">
                Full manifesto <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </section>
        )}

        {focus === "paradigm" && (
          <section className="mb-8 space-y-3 border border-amber-500/30 bg-background/50 p-4">
            <h2 className="flex items-center gap-2 font-display text-sm uppercase tracking-widest text-amber-200">
              <Cpu className="h-4 w-4" /> Eight axioms
            </h2>
            <ol className="space-y-3">
              {AQAI_AXIOMS.map((a) => (
                <li key={a.id} className="border-l-2 border-amber-500/40 pl-3 text-sm">
                  <div className="font-saga text-foreground">{a.id}. {a.name}</div>
                  <div className="text-xs text-muted-foreground">Today: {a.vs}</div>
                  <div className="text-xs text-cyan-200/90">AQAI: {a.aqai}</div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {focus === "market" && (
          <section className="mb-8 space-y-3 border border-primary/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Market kill-map</h2>
            <ul className="space-y-2 text-sm">
              {MARKET_DOMINANCE.map((m) => (
                <li key={m.rival} className="flex flex-col gap-0.5 border-l-2 border-primary/40 pl-3 sm:flex-row sm:gap-3">
                  <span className="w-40 shrink-0 font-mono text-xs text-primary">{m.rival}</span>
                  <span className="text-muted-foreground">{m.kill}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Architectural unity is the moat — not a single FLOPs chart. Design claim; silicon is the roadmap.
            </p>
          </section>
        )}

        {focus === "score" && (
          <section className="mb-8 space-y-3 border border-amber-500/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-amber-200">Superpower index</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="py-1 pr-2">Axis</th>
                    <th className="px-1">GPU</th>
                    <th className="px-1">TPU</th>
                    <th className="px-1">Neuro</th>
                    <th className="px-1 text-amber-200">AQAI</th>
                  </tr>
                </thead>
                <tbody>
                  {CAPABILITY_SCORECARD.map((r) => (
                    <tr key={r.axis} className="border-t border-border/40">
                      <td className="py-1.5 pr-2 text-foreground">{r.axis}</td>
                      <td className="px-1 text-muted-foreground">{r.gpu}</td>
                      <td className="px-1 text-muted-foreground">{r.tpu}</td>
                      <td className="px-1 text-muted-foreground">{r.neuro}</td>
                      <td className="px-1 font-semibold text-amber-200">{r.aqai}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {focus === "skus" && (
          <section className="mb-8 space-y-3 border border-primary/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Product SKUs</h2>
            <ul className="space-y-3 text-sm">
              {AQAI_SKUS.map((s) => (
                <li key={s.id} className="border-l-2 border-cyan-500/40 pl-3">
                  <div className="font-mono text-xs text-cyan-200">{s.id}</div>
                  <div className="font-saga">{s.wedge}</div>
                  <div className="text-xs text-muted-foreground">{s.axioms} · {s.envelope}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {focus === "phases" && (
          <section className="mb-8 space-y-3 border border-primary/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Soft→Hard roadmap</h2>
            <ol className="space-y-2 text-sm">
              {DOMINATION_PHASES.map((p) => (
                <li key={p.phase} className="border-l-2 border-primary/40 pl-3">
                  <div className="font-saga">
                    Phase {p.phase} — {p.name}
                  </div>
                  <div className="text-xs text-muted-foreground">Ships: {p.ships}</div>
                  <div className="text-xs text-cyan-200/80">Locks: {p.locks}</div>
                </li>
              ))}
            </ol>
          </section>
        )}

        {focus === "capital" && (
          <section className="mb-8 space-y-3 border border-amber-500/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-amber-200">Capital verdict</h2>
            <p className="text-sm text-foreground">{CAPITAL_VERDICT.path}</p>
            <p className="text-xs text-muted-foreground">Ask: {CAPITAL_VERDICT.ask}</p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {CAPITAL_VERDICT.useOfFunds.map((u) => (
                <li key={u.item}>{u.pct}% → {u.item}</li>
              ))}
            </ul>
            <p className="text-[11px] text-amber-200/80">Reject: {CAPITAL_VERDICT.reject.join(" · ")}</p>
            <Button asChild size="sm" variant="outline" className="mt-2">
              <a href="/chipset/pitch-deck.html" target="_blank" rel="noreferrer">
                Open pitch deck <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </a>
            </Button>
          </section>
        )}

        {focus === "mfg" && (
          <section className="mb-8 space-y-3 border border-primary/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Manufacturing gates</h2>
            <ol className="space-y-2 text-sm">
              {MANUFACTURING_GATES.map((g) => (
                <li key={g.id} className="border-l-2 border-primary/40 pl-3">
                  <div className="font-saga">
                    {g.id} — {g.name}{" "}
                    <span className="font-mono text-[10px] text-cyan-200">[{g.status}]</span>
                    {g.progressPct != null && (
                      <span className="ml-2 font-mono text-[10px] text-amber-200">{g.progressPct}%</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Exit: {g.exit}</div>
                  {g.honestyNote && (
                    <div className="text-[10px] text-amber-200/80">Note: {g.honestyNote}</div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {(focus === "g1" || focus === "g2" || focus === "g3") && (
          <section className="mb-8 space-y-3 border border-cyan-500/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-cyan-200">
              {focus.toUpperCase()} gate parameters
            </h2>
            {getGatesG1G3()
              .filter((g) => g.id === focus.toUpperCase())
              .map((g) => (
                <div key={g.id} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Owner: {g.owner} · Target: {g.targetClose} · Pack: {g.packPath}
                  </p>
                  {g.honestyNote && (
                    <p className="text-[11px] text-amber-200/90">{g.honestyNote}</p>
                  )}
                  <ul className="space-y-1.5 text-xs">
                    {g.parameters.map((p) => (
                      <li key={p.key} className="border-l-2 border-cyan-500/40 pl-2">
                        <span className="font-saga">{p.label}</span>{" "}
                        <span className="font-mono text-[10px] text-cyan-200">[{p.status}]</span>
                        <div className="font-mono text-[10px] text-muted-foreground">{p.value}</div>
                        {p.evidence && (
                          <div className="font-mono text-[10px] text-amber-200/70">{p.evidence}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </section>
        )}

        {focus === "g2fpga" && (
          <section className="mb-8 space-y-2 border border-amber-500/30 bg-background/50 p-4 text-sm">
            <h2 className="font-display text-sm uppercase tracking-widest text-amber-200">G2 FPGA status</h2>
            <p className="text-xs text-muted-foreground">
              Target: {G2_SEAL_DEMO.board} ({G2_SEAL_DEMO.fpgaFamily}) · Mode: {G2_SEAL_DEMO.mode}
            </p>
            <p className="text-xs text-amber-200/90">{G2_SEAL_DEMO.honesty}</p>
            <ul className="space-y-1 font-mono text-[11px] text-muted-foreground">
              <li>Seal round-trip cycles: {G2_SEAL_DEMO.totalCycles} ({G2_SEAL_DEMO.latencyNs} ns)</li>
              <li>Digest match: {String(G2_SEAL_DEMO.digestMatch)}</li>
              <li>Report: hardware/aetherion-qai/gates/G2/seal-roundtrip-report.json</li>
            </ul>
          </section>
        )}

        {focus === "investors" && (
          <section className="mb-8 space-y-3 border border-primary/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Investor map</h2>
            <ul className="space-y-2 text-sm">
              {INVESTOR_SEGMENTS.map((s) => (
                <li key={s.segment} className="border-l-2 border-cyan-500/40 pl-3">
                  <div className="font-saga">{s.segment}</div>
                  <div className="text-xs text-muted-foreground">{s.check} · {s.thesis}</div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">
              Fill <code className="text-foreground">investor-crm.csv</code> then dry-run{" "}
              <code className="text-foreground">node scripts/aqai-funding-outreach.mjs</code>. Placeholders are never sent.
            </p>
          </section>
        )}

        {focus === "grants" && (
          <section className="mb-8 space-y-3 border border-primary/30 bg-background/50 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Grants pipeline</h2>
            <ul className="space-y-2 text-sm">
              {GRANT_TARGETS.map((g) => (
                <li key={g.id} className="border-l-2 border-amber-500/40 pl-3">
                  <div className="font-mono text-xs text-amber-200">{g.id}</div>
                  <div className="font-saga">{g.name}</div>
                  <div className="text-xs text-muted-foreground">{g.band} · {g.action}</div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">Portal submission is operator-executed (SAM.gov / FOAs). Kit in funding/GRANTS.md.</p>
          </section>
        )}

        {focus === "family" && (
          <section className="mb-8 space-y-3 border border-primary/25 bg-background/40 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Chipset family</h2>
            <ul className="space-y-2 text-sm">
              {AQAI_PARTS.map((p) => (
                <li key={p.id} className="border-l-2 border-primary/40 pl-3">
                  <div className="font-mono text-xs text-primary">{p.id}</div>
                  <div className="font-saga">{p.role}</div>
                  <div className="text-xs text-muted-foreground">{p.bind} · {p.market}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {focus === "isa" && (
          <section className="mb-8 space-y-3 border border-primary/25 bg-background/40 p-4">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">Paradigm ISA</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {AQAI_OPCODES.map((o) => (
                <div key={o.mnem} className="rounded-sm border border-border/50 px-3 py-2">
                  <div className="font-mono text-xs text-cyan-200">{o.mnem}</div>
                  <div className="text-[11px] text-muted-foreground">{o.hint}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {focus === "bios" && (
          <section className="mb-8 space-y-2 border border-primary/25 bg-background/40 p-4 text-sm text-muted-foreground">
            <h2 className="font-display text-sm uppercase tracking-widest text-primary">BIOS / POST</h2>
            <p>Reset → braid self-test → phoneme POST → skin localize → EP lock → SphinxHash → Seal IOC → kernel @ <code className="text-foreground">0x00010000</code>.</p>
            <p>POST: <code className="text-foreground">0x33</code> SQMT · <code className="text-foreground">0xC0</code> Seal · <code className="text-foreground">0xE1</code> EP · <code className="text-foreground">0xFF</code> ready.</p>
          </section>
        )}

        {skin && (
          <div className="mb-4 flex h-16 items-end gap-0.5 border border-amber-500/20 bg-black/40 px-2 py-2">
            {skin.map((v, i) => (
              <div
                key={i}
                className="flex-1 bg-gradient-to-t from-amber-600/80 to-cyan-400/80"
                style={{ height: `${Math.max(4, v * 100)}%` }}
                title={`site ${i}: ${(v * 100).toFixed(1)}%`}
              />
            ))}
          </div>
        )}

        {trace.length > 0 && (
          <section className="mb-8 max-h-80 overflow-auto border border-amber-500/30 bg-black/50 p-4 font-mono text-[11px] leading-relaxed text-amber-100/90">
            {trace.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </section>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/tarot">
              Caduceus tarot <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/lattice/caduceus">Quantum Caduceus</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/lattice/nh">NH lattice</Link>
          </Button>
          <Button asChild variant="outline" size="sm" data-testid="chipset-speculative-link">
            <Link to="/caduceus/speculative">Retrocausal Seal</Link>
          </Button>
          <Button asChild variant="outline" size="sm" data-testid="chipset-hexagram-tetra-link">
            <Link to="/caduceus/speculative/hexagram-tetra">Hexagram · Tetra</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
