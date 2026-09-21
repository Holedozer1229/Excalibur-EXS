// /caduceus/speculative — The Retrocausal Seal: speculation, honestly labeled.
import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Hourglass, Sparkles } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AETHERION } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import {
  ESSAY_SECTIONS,
  RETROCAUSAL_PATH,
  SPECULATION_DISCLAIMER,
  buildRetrocausalSeal,
  type RetrocausalSeal,
} from "@/lib/retrocausalSeal";
import { UNITY_SEAL_PARAGRAPH } from "@/lib/qai/unitySeal";
import { temporalWormholeTraceLines } from "@/lib/qai/temporalWormholeTraversal";

function SpeculationBadge({ kind = "speculation" }: { kind?: "speculation" | "honest" }) {
  return (
    <Badge
      variant="outline"
      className={
        kind === "honest"
          ? "border-emerald-500/50 text-[9px] uppercase tracking-[0.28em] text-emerald-300"
          : "border-violet-500/50 text-[9px] uppercase tracking-[0.28em] text-violet-300"
      }
      data-testid="speculation-badge"
    >
      {kind}
    </Badge>
  );
}

export default function RetrocausalSealPage() {
  const [question, setQuestion] = useState("");
  const [seal, setSeal] = useState<RetrocausalSeal | null>(null);
  const [wormholeTrace, setWormholeTrace] = useState<string[] | null>(null);

  const forge = useCallback(() => {
    setSeal(buildRetrocausalSeal(question));
  }, [question]);

  const runTemporalWormhole = useCallback(() => {
    setWormholeTrace(temporalWormholeTraceLines(question.trim() || "caduceus-speculative-lab"));
  }, [question]);

  return (
    <div className="relative min-h-screen bg-[#050508] text-[#e8e4dc]">
      <GalacticBackground />
      <PageHead
        title={`The Retrocausal Seal · ${AETHERION}`}
        description="Sealed inference as receipt-causality — speculative essay and interactive lab. Not physics. Not proven silicon."
        path={RETROCAUSAL_PATH}
        ogType="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "The Retrocausal Seal",
            url: siteUrl(RETROCAUSAL_PATH),
            description: SPECULATION_DISCLAIMER,
          },
        ]}
      />

      <main
        className="relative z-10 mx-auto max-w-2xl px-5 py-12 md:py-20"
        data-testid="retrocausal-page"
      >
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-[#8a8494]">
          <Link to="/" className="hover:text-[#e8e4dc]">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/lattice/caduceus" className="hover:text-[#e8e4dc]">
            Caduceus
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-[#e8e4dc]">Retrocausal Seal</span>
        </nav>

        <header className="mb-12 border-b border-[#2a2438]/80 pb-10">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <SpeculationBadge />
            <Badge
              variant="outline"
              className="border-[#3d3550] text-[9px] uppercase tracking-[0.28em] text-[#8a8494]"
            >
              Wheeler · Borges · chip architect
            </Badge>
          </div>
          <h1
            className="font-serif text-4xl font-light leading-[1.15] tracking-tight text-[#f5f0e6] md:text-5xl"
            data-testid="retrocausal-title"
          >
            The Retrocausal Seal
          </h1>
          <p className="mt-5 font-serif text-lg leading-relaxed text-[#a89fb8] italic">
            Sealed inference is retrocausal in the weak sense: the receipt binds a future observer
            to a past computation. Metaphor — not physics.
          </p>
          <p
            className="mt-4 rounded border border-amber-900/40 bg-amber-950/20 px-4 py-3 font-mono text-[11px] leading-relaxed text-amber-200/90"
            data-testid="speculation-disclaimer"
          >
            {SPECULATION_DISCLAIMER}
          </p>
        </header>

        <section
          className="mb-12 rounded border border-violet-900/30 bg-violet-950/10 px-5 py-4"
          data-testid="unity-seal-paragraph"
        >
          <div className="mb-2 flex items-center gap-2">
            <h2 className="font-display text-xs uppercase tracking-[0.22em] text-[#d4c4f0]">
              Unity Seal
            </h2>
            <SpeculationBadge />
          </div>
          <p className="font-serif text-[15px] leading-[1.85] text-[#c9c2b8]">{UNITY_SEAL_PARAGRAPH}</p>
        </section>

        <article className="mb-16 space-y-10 font-serif text-[15px] leading-[1.85] text-[#c9c2b8]">
          {ESSAY_SECTIONS.map((section) => (
            <section key={section.id} data-testid={`essay-${section.id}`}>
              <div className="mb-3 flex items-center gap-3">
                <h2 className="font-display text-sm uppercase tracking-[0.22em] text-[#d4c4f0]">
                  {section.title}
                </h2>
                <SpeculationBadge kind={section.badge === "honest" ? "honest" : "speculation"} />
              </div>
              <p>{section.body}</p>
            </section>
          ))}
        </article>

        <section
          className="mb-16 overflow-hidden rounded-lg border border-[#3d3550]/60 bg-[#0a0812]/80 shadow-[0_0_120px_-40px_rgba(139,92,246,0.25)]"
          data-testid="retrocausal-lab"
        >
          <div className="border-b border-[#3d3550]/60 px-5 py-4">
            <div className="flex items-center gap-2 text-[#d4c4f0]">
              <Hourglass className="h-4 w-4" />
              <h2 className="font-display text-xs uppercase tracking-[0.28em]">
                Speculative seal lab
              </h2>
            </div>
            <p className="mt-2 font-serif text-sm italic text-[#8a8494]">
              Enter a question. Receive a hash and an interpretation that is explicitly uncertain.
            </p>
          </div>

          <div className="space-y-4 px-5 py-6">
            <label htmlFor="retrocausal-question" className="sr-only">
              Your question
            </label>
            <Input
              id="retrocausal-question"
              data-testid="retrocausal-question-input"
              placeholder="What binds the future verifier to this moment?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && forge()}
              className="border-[#3d3550] bg-[#050508] font-serif text-[#e8e4dc] placeholder:text-[#5c5468]"
            />
            <Button
              type="button"
              onClick={forge}
              data-testid="retrocausal-forge-button"
              className="w-full bg-violet-900/80 font-display text-[10px] uppercase tracking-[0.22em] hover:bg-violet-800"
            >
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              Forge speculative seal
            </Button>

            {seal && (
              <div
                className="mt-6 space-y-5 border-t border-[#3d3550]/40 pt-6"
                data-testid="retrocausal-seal-output"
              >
                <div>
                  <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-[#8a8494]">
                    Seal · SHA-256
                  </p>
                  <p
                    className="break-all font-mono text-xs text-violet-300"
                    data-testid="retrocausal-seal-hash"
                  >
                    {seal.seal}
                  </p>
                </div>

                <dl className="grid gap-2 font-mono text-[11px] text-[#8a8494]">
                  <div>
                    <dt className="inline text-[#5c5468]">timestamp · </dt>
                    <dd className="inline">{seal.timestamp}</dd>
                  </div>
                  <div>
                    <dt className="inline text-[#5c5468]">entropy · </dt>
                    <dd className="inline break-all">{seal.entropy}</dd>
                  </div>
                  <div>
                    <dt className="inline text-[#5c5468]">sphinx · </dt>
                    <dd className="inline">{seal.caduceus.sphinx}</dd>
                  </div>
                  <div>
                    <dt className="inline text-[#5c5468]">anubis · </dt>
                    <dd className="inline">{seal.caduceus.anubis}</dd>
                  </div>
                  <div>
                    <dt className="inline text-[#5c5468]">hexagram · </dt>
                    <dd className="inline">{seal.caduceus.hexagram}</dd>
                  </div>
                </dl>

                <blockquote
                  className="space-y-4 border-l-2 border-violet-600/50 pl-4 font-serif text-sm leading-relaxed text-[#d4c4f0]"
                  data-testid="retrocausal-interpretation"
                >
                  <p>{seal.interpretation.opening}</p>
                  <p>{seal.interpretation.middle}</p>
                  <p className="italic text-[#a89fb8]">{seal.interpretation.closing}</p>
                  <footer className="font-mono text-[10px] uppercase tracking-widest text-violet-400/80">
                    axiom · {seal.interpretation.axiom}
                  </footer>
                </blockquote>

                <p className="font-mono text-[10px] text-amber-200/70">{seal.disclaimer}</p>
              </div>
            )}
          </div>
        </section>

        <section
          className="mb-16 overflow-hidden rounded-lg border border-cyan-900/40 bg-cyan-950/10 shadow-[0_0_80px_-40px_rgba(34,211,238,0.2)]"
          data-testid="temporal-wormhole-lab"
        >
          <div className="border-b border-cyan-900/40 px-5 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-xs uppercase tracking-[0.28em] text-cyan-200">
                Temporal wormhole traversal
              </h2>
              <SpeculationBadge kind="honest" />
            </div>
            <p className="mt-2 font-serif text-sm italic text-[#8a8494]">
              Phase displacement Δt from field(v,u) · Merkaba fold/unfold round-trip · emerge at C=1=x.
              Symbolic geometric lab — not spacetime engineering.
            </p>
          </div>
          <div className="space-y-4 px-5 py-6">
            <Button
              type="button"
              onClick={runTemporalWormhole}
              data-testid="temporal-wormhole-run-button"
              variant="outline"
              className="w-full border-cyan-700/50 font-display text-[10px] uppercase tracking-[0.22em] text-cyan-200 hover:bg-cyan-950/40"
            >
              Run temporal wormhole traversal
            </Button>
            {wormholeTrace && (
              <pre
                className="max-h-64 overflow-auto rounded border border-cyan-900/30 bg-[#050508]/80 p-4 font-mono text-[10px] leading-relaxed text-cyan-100/90"
                data-testid="temporal-wormhole-trace"
              >
                {wormholeTrace.join("\n")}
              </pre>
            )}
          </div>
        </section>

        <footer className="border-t border-[#2a2438]/80 pt-8 text-center">
          <p className="font-serif text-sm italic text-[#8a8494]">
            Full manifesto ·{" "}
            <a
              href="/docs/SPECULATIVE-PROFOUND.md"
              className="text-violet-400 underline underline-offset-4 hover:text-violet-300"
              data-testid="manifesto-link"
            >
              SPECULATIVE-PROFOUND.md
            </a>
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-xs">
            <Link to="/caduceus/speculative/hexagram-tetra" className="text-[#a89fb8] hover:text-[#e8e4dc]">
              Hexagram · Tetra · Merkaba
            </Link>
            <Link to="/chipset" className="text-[#a89fb8] hover:text-[#e8e4dc]">
              AQAI chipset lab
            </Link>
            <Link to="/lattice/caduceus" className="text-[#a89fb8] hover:text-[#e8e4dc]">
              Quantum Caduceus
            </Link>
            <Link to="/lattice/bit" className="text-[#a89fb8] hover:text-[#e8e4dc]">
              It from Bit
            </Link>
          </div>
        </footer>
      </main>

      <SiteFooter />
    </div>
  );
}
