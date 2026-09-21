// /lattice/nh — non-Hermitian lattice lab.
// Static poster paints first; option buttons load only the chosen panels.
import { lazy, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { Atom, ArrowRight, ChevronRight, Play } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { NHLabFocus } from "@/components/NHLatticeLab";

const NHLatticeLab = lazy(() => import("@/components/NHLatticeLab"));

const SITE = "https://www.excaliburcrypto.com";
const POSTER = "/physics/nh-lattice-poster.webp";

const OPTIONS: { id: NHLabFocus; label: string; hint: string }[] = [
  { id: "ssh", label: "Run SSH bands", hint: "Panels a · g" },
  { id: "hatano", label: "Run skin effect", hint: "Panels b · e · f" },
  { id: "ep", label: "Run EPs", hint: "Panels c · d" },
  { id: "all", label: "Run all live", hint: "Full interactive lab" },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  name: "Non-Hermitian Lattice Lab",
  description:
    "Interactive non-Hermitian topological physics: the non-reciprocal SSH model, the Hatano-Nelson skin effect, PT-symmetric exceptional points, and eigenvalue braiding — computed analytically in the browser on demand.",
  url: `${SITE}/lattice/nh`,
  educationalLevel: "advanced",
  learningResourceType: "interactive simulation",
  image: `${SITE}${POSTER}`,
};

export default function NonHermitianLattice() {
  const [focus, setFocus] = useState<NHLabFocus | null>(null);

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground mode="lite" />
      <PageHead
        title="Non-Hermitian Lattice Lab — Skin Effect & Exceptional Points | Aetherion"
        description="Poster-first non-Hermitian lab. Run SSH, Hatano-Nelson skin effect, or exceptional points on demand — no canvases until you choose."
        path="/lattice/nh"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:py-16">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Non-Hermitian lattice</span>
        </nav>

        <header className="mb-8 text-center">
          <Badge variant="outline" className="mb-3 border-amber-300/40 text-amber-200">
            <Atom className="mr-1 h-3 w-3" /> Poster-first · pick a run
          </Badge>
          <h1 className="font-display text-3xl uppercase tracking-widest sm:text-5xl">
            Non-Hermitian <span className="gradient-neon-text">Lattice Lab</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            When a lattice can gain and lose energy — or hop more easily one way than
            the other — its Hamiltonian stops being Hermitian. Energies go complex,
            bulk states pile at an edge, and bands fuse at exceptional points.
          </p>
        </header>

        <figure className="mb-6 overflow-hidden rounded-sm border border-amber-500/30 bg-black/40">
          <img
            src={POSTER}
            alt="Non-Hermitian condensed matter panels: NH-SSH bands, Hatano-Nelson skin effect, exceptional points, phase diagram, IPR"
            width={1600}
            height={1423}
            decoding="async"
            fetchPriority="high"
            className="h-auto w-full"
          />
        </figure>

        <div className="mb-8 grid gap-2 sm:grid-cols-2">
          {OPTIONS.map((opt) => {
            const active = focus === opt.id;
            return (
              <Button
                key={opt.id}
                type="button"
                variant={active ? "default" : "outline"}
                className="h-auto flex-col items-start gap-0.5 px-4 py-3 text-left font-display"
                onClick={() => setFocus(opt.id)}
              >
                <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest">
                  <Play className="h-3.5 w-3.5" />
                  {opt.label}
                </span>
                <span className="text-[10px] font-mono font-normal normal-case tracking-normal text-muted-foreground">
                  {opt.hint}
                </span>
              </Button>
            );
          })}
        </div>

        {focus && (
          <Suspense
            fallback={
              <div className="mb-8 h-64 animate-pulse rounded-sm border border-amber-500/20 bg-amber-500/5" />
            }
          >
            <NHLatticeLab focus={focus} />
          </Suspense>
        )}

        <article className="mt-10 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-2 font-display text-xl uppercase tracking-widest text-amber-200">The non-reciprocal SSH chain</h2>
            <p>
              Dimerized hoppings <span className="font-mono text-foreground">t₁</span> /{" "}
              <span className="font-mono text-foreground">t₂</span> plus non-reciprocity{" "}
              <span className="font-mono text-foreground">γ</span> lift bands off the real axis.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-xl uppercase tracking-widest text-amber-200">The Hatano-Nelson skin effect</h2>
            <p>
              Asymmetric hopping collapses the PBC ellipse onto a real OBC line and piles every eigenstate at one edge.
            </p>
          </section>
          <section>
            <h2 className="mb-2 font-display text-xl uppercase tracking-widest text-amber-200">Exceptional points</h2>
            <p>
              At an EP eigenvalues and eigenvectors merge; encircling braids the two sheets — closed-form, no solver.
            </p>
          </section>
        </article>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link to="/token/lattice">
              Fair lattice <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/">Home</Link>
          </Button>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
