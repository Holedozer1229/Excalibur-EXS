// /token/wuruu — Solana leg of the Aetherion cross-chain lattice.
// Static, presentational, SEO-tuned. No wallet, no RPC.
import { Link } from "react-router-dom";
import CrossChainMap from "@/components/CrossChainMap";
import { ArrowRight, ChevronRight, Activity, Link2, ShieldCheck } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import UruuContractCard from "@/components/UruuContractCard";
import WrapConsole from "@/components/WrapConsole";
import { lazy, Suspense } from "react";
const SolanaLiveSection = lazy(() => import("@/components/solana/SolanaLiveSection"));
import SolanaErrorBoundary from "@/components/solana/SolanaErrorBoundary";

const SITE = "https://www.excaliburcrypto.com";

const FACTS = [
  { k: "Chain", v: "Solana" },
  { k: "Standard", v: "SPL · wrapped URUU" },
  { k: "Primary venue", v: "Custom bonding curve" },
  { k: "Price input", v: "SKYNT/WETH pool depth (Ethereum)" },
  { k: "Flow input", v: "ATART BRC-20 reading bonus (Bitcoin)" },
];

const FAQS = [
  {
    q: "What is wURUU?",
    a: "wURUU is the wrapped Solana representation of URUU, the live zkSync Era token. It is quoted on a custom two-way bonding curve P(s) = P0 (1 + s/S)^n that uses depth carried over from the Ethereum SKYNT/WETH pair as the floor P0.",
  },
  {
    q: "Why a two-way curve instead of a one-way bonding curve?",
    a: "A one-way curve that keeps all SOL is a trap. The fair lattice quotes a custom power curve both ways with a 1% maximum protocol fee (0.3058% is the intended operating number) so you can exit. See /token/lattice.",
  },
  {
    q: "How does the ATART bonus enter the curve?",
    a: "Verified tarot readings mint ATART as a BRC-20 receipt on Bitcoin. Those receipts route a bonus into the wURUU curve, which is how divinatory practice on Aetherion becomes a flow input to the Solana leg.",
  },
  {
    q: "Is wURUU an investment?",
    a: "No. Aetherion makes no price, revenue, or return claims. These pages document how the legs are wired; they are not an offer, solicitation, or financial advice.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Tokenomics", item: `${SITE}/tokenomics` },
      { "@type": "ListItem", position: 3, name: "wURUU", item: `${SITE}/token/wuruu` },
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

export default function TokenWuruu() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="wURUU — Solana Bonding Curve Leg of the Aetherion Lattice"
        description="wURUU is the Solana wrap of live zkSync URUU: a custom two-way bonding curve priced off SKYNT/WETH, 1% fee cap, calculator only."
        path="/token/wuruu"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/tokenomics" className="hover:text-foreground">Tokenomics</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">wURUU</span>
        </nav>

        <header className="mb-10">
          <Badge variant="outline" className="mb-4 text-[10px] uppercase tracking-widest">
            Solana · SPL wrapped
          </Badge>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            wURUU
          </h1>
          <p className="text-lg text-muted-foreground">
            The Solana leg of the Aetherion lattice. A custom bonding curve
            that absorbs Ethereum-side depth as P₀ and prices URUU
            continuously, with a Bitcoin-side bonus routed in from tarot
            reading receipts. The URUU→wURUU custody wrap is not live. ETH→WETH
            is live on /wrap.
          </p>
        </header>

        <div className="mb-8">
          <UruuContractCard compact />
        </div>
        <div className="mb-10">
          <WrapConsole compact />
        </div>

        <Card className="mb-10 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5">
            <dl className="divide-y divide-border text-sm">
              {FACTS.map((f) => (
                <div key={f.k} className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">{f.k}</dt>
                  <dd className="text-right font-mono text-xs md:text-sm">{f.v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <SolanaErrorBoundary>
          <Suspense fallback={null}>
            <SolanaLiveSection cluster="devnet" className="mb-10" />
          </Suspense>
        </SolanaErrorBoundary>

        <article className="space-y-10">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-accent">
              <Activity className="h-5 w-5" /> How the curve is priced
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-foreground/90 md:text-base">
              The curve does not bootstrap its own price. It reads depth from
              the{" "}
              <Link to="/token/skynt" className="text-primary hover:underline">
                SKYNT/WETH pair on Ethereum
              </Link>{" "}
              as the floor P₀ of{" "}
              <span className="font-mono text-sm">P(s) = P₀ (1 + s/S)ⁿ</span>
              — the deepest venue in the lattice — and quotes URUU against
              it continuously. That keeps the Solana leg anchored instead of
              drifting on thin local flow. See the{" "}
              <Link to="/token/lattice" className="text-primary hover:underline">
                custom bonding curve
              </Link>
              .
            </p>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              Flow arrives from Bitcoin too: every verified reading on the{" "}
              <Link to="/tarot" className="text-primary hover:underline">tarot engine</Link>{" "}
              mints{" "}
              <Link to="/claim/tart" className="text-primary hover:underline">ATART</Link>,
              and those BRC-20 receipts route a bonus into this curve.
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <Link2 className="h-5 w-5" /> Bridged by URUU over zkSync
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              wURUU is the wrapped destination representation of{" "}
              <Link to="/token/uruu" className="text-primary hover:underline">URUU</Link>,
              live on zkSync Era. The wrap itself is not live. The full
              topology — four legs, one liquidity surface, plus the{" "}
              <Link to="/token/aetx" className="text-primary hover:underline">AETX</Link>{" "}
              round seal — is mapped on the{" "}
              <Link to="/tokenomics" className="text-primary hover:underline">tokenomics page</Link>.
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-gold">
              <ShieldCheck className="h-5 w-5" /> Disclosure
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              Aetherion makes no price, revenue, or return claims about wURUU
              or any other tick documented here. Nothing on this page is an
              offer, a solicitation, or financial advice. Verify every mint
              address and venue yourself before interacting with it.
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
              { label: "URUU on zkSync", href: "/token/uruu" },
              { label: "SKYNT on Ethereum", href: "/token/skynt" },
              { label: "Custom bonding curve", href: "/token/lattice" },
              { label: "AETX token page", href: "/token/aetx" },
              { label: "Full tokenomics", href: "/tokenomics" },
              { label: "Claim ATART on Bitcoin", href: "/claim/tart" },
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

        <section className="mt-12">
          <CrossChainMap />
        </section>

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/tarot">
              Cast a reading — mint ATART
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
