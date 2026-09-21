// /lattice/bit — John Wheeler's "It from Bit" and Bitcoin as the public bit layer.
import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, Binary, Link2, ShieldCheck } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import BitCollapsePanel from "@/components/BitCollapsePanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const WheelerTerminal = lazy(() =>
  import("@/components/WheelerTerminal").then((m) => ({ default: m.WheelerTerminal })),
);

const SITE = "https://www.excaliburcrypto.com";

const LAYERS = [
  {
    k: "Wheeler",
    v: "It from Bit",
    note: "Reality is participatory. Your question chooses which bit string gets measured.",
  },
  {
    k: "Bitcoin L1",
    v: "Public bits",
    note: "SHA-256 commitments and BRC-20 inscriptions — yes/no ops anyone can audit.",
  },
  {
    k: "Lattice",
    v: "SKYNT → URUU → wURUU",
    note: "Ethereum depth, zkSync token, Solana curve — flow priced, not trapped.",
  },
];

const FAQS = [
  {
    q: "What did John Wheeler mean by It from Bit?",
    a: "Wheeler argued that every physical quantity derives its meaning from binary answers to yes/no questions — bits. The universe is participatory: the observer's measurement is part of what gets recorded.",
  },
  {
    q: "Why Bitcoin?",
    a: "Bitcoin L1 is the slowest, most auditable place to commit bits. Aetherion uses it for practice receipts (ATART, AETX), not for custody of your keys. The hash is the seal; the inscription is the receipt.",
  },
  {
    q: "Is this a bridge or an investment?",
    a: "No. This page is myth, math, and a client-side hash demo. URUU on zkSync is a live token; the wrap and bonding curve remain calculators only.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "It from Bit", item: `${SITE}/lattice/bit` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export default function WheelerBit() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="It from Bit — John Wheeler & Bitcoin | Aetherion Lattice"
        description="John Wheeler's participatory universe meets Bitcoin's public bits: SHA-256 collapse, BRC-20 receipts, and the lattice from SKYNT to URUU."
        path="/lattice/bit"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">It from Bit</span>
        </nav>

        <header className="mb-10">
          <Badge variant="outline" className="mb-4 text-[10px] uppercase tracking-widest">
            Wheeler · Bitcoin · lattice
          </Badge>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            It from Bit
          </h1>
          <p className="text-lg text-muted-foreground">
            John Wheeler: every &ldquo;it&rdquo; — every thing — comes from bits.
            Bitcoin is where Aetherion commits those bits in public: tarot
            readings sealed as hashes, practice counted as{" "}
            <Link to="/claim/tart" className="text-primary hover:underline">ATART</Link>,
            liquidity priced on the{" "}
            <Link to="/token/lattice" className="text-primary hover:underline">custom curve</Link>.
          </p>
        </header>

        <blockquote className="mb-8 border-l-2 border-primary/60 pl-4 text-sm italic text-foreground/90">
          &ldquo;It from bit. Otherwise put, every it — every particle, every field
          of force, even the space-time continuum itself — derives its function,
          its meaning, its very existence entirely from binary choices, from
          bits.&rdquo; — John Archibald Wheeler
        </blockquote>

        <Card className="mb-10 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5">
            <dl className="divide-y divide-border text-sm">
              {LAYERS.map((r) => (
                <div key={r.k} className="py-2">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">{r.k}</dt>
                    <dd className="text-right font-mono text-xs md:text-sm">{r.v}</dd>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{r.note}</p>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <div className="mb-10">
          <BitCollapsePanel />
        </div>

        <article className="space-y-10">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <Binary className="h-5 w-5" /> Bitcoin as the bit layer
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-foreground/90 md:text-base">
              A tarot cast on Aetherion ends in a SHA-256 commitment — a 256-bit
              answer to &ldquo;did this reading happen?&rdquo; When you inscribe{" "}
              <strong>ATART</strong> on Bitcoin, you publish another bit of
              practice: +1 receipt per verified reading. No custodian holds the
              meaning; the chain holds the bit.
            </p>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              That is different from the{" "}
              <Link to="/token/uruu" className="text-primary hover:underline">URUU</Link>{" "}
              token on zkSync or the{" "}
              <Link to="/token/lattice" className="text-primary hover:underline">wURUU curve</Link>{" "}
              on Solana — those legs price flow. Bitcoin is where the oracle
              keeps its receipts honest.
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-accent">
              <Link2 className="h-5 w-5" /> Into the lattice
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              Bits climb the lattice: SKYNT/WETH depth on Ethereum sets the floor,
              live URUU on zkSync anchors the bridge asset, the custom bonding
              curve quotes wURUU on Solana, and ATART bonuses route in from
              Bitcoin. Each leg discloses its fee. None of them trap exit.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-2xl uppercase tracking-widest text-gold">
              Wheeler terminal
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              The full participatory engine — Schumann modes, dual Caduceus,
              observe, bit8 loops — runs server-side. Type <code className="font-mono text-xs">observe your intent</code> or try a quick command.
            </p>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-md bg-card/40" />}>
              <WheelerTerminal />
            </Suspense>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <ShieldCheck className="h-5 w-5" /> Disclosure
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              Myth, math, and receipts — not financial advice. The bit collapse
              is client-side. BRC-20 mints cost real sats. URUU wrap and the
              bonding curve are calculators only.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl uppercase tracking-widest text-accent">
              Frequently asked
            </h2>
            <div className="space-y-3">
              {FAQS.map((f) => (
                <Card key={f.q} className="bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="mb-1 text-sm font-medium">{f.q}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </article>

        <section className="mt-12 border-t border-border pt-8">
          <h2 className="mb-4 text-sm uppercase tracking-widest text-muted-foreground">
            Explore further
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Custom bonding curve", href: "/token/lattice" },
              { label: "URUU on zkSync", href: "/token/uruu" },
              { label: "Claim ATART on Bitcoin", href: "/claim/tart" },
              { label: "Force Oracle", href: "/lattice/force" },
              { label: "Regal loop-hole", href: "/lattice/loop" },
              { label: "Full tokenomics", href: "/tokenomics" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/tarot">
              Cast a reading — mint a bit
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
