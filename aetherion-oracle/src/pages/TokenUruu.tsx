// /token/uruu — live URUU ERC-20 on zkSync Era.
// Presentational. Token is live. Wrap, curve, and relayer are not.
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ShieldCheck, Link2 } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import UruuContractCard from "@/components/UruuContractCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  URUU_ADDRESS,
  URUU_CHAIN,
  URUU_EXPLORER,
  URUU_STANDARD,
  URUU_STATUS,
  URUU_TICK,
  uruuShort,
} from "@/lib/uruu";

const SITE = "https://www.excaliburcrypto.com";

const FACTS = [
  { k: "Chain", v: URUU_CHAIN },
  { k: "Standard", v: URUU_STANDARD },
  { k: "Status", v: `Token ${URUU_STATUS}` },
  { k: "Contract", v: uruuShort },
  { k: "Wrap / curve", v: "Not live — calculator only" },
];

const FAQS = [
  {
    q: "Is URUU live?",
    a: `The ${URUU_TICK} token contract is live on ${URUU_CHAIN} at ${URUU_ADDRESS}. The wrap into wURUU and the custom bonding curve are calculators only. Do not send funds to any wrap or pool address shown as a demo.`,
  },
  {
    q: "Where does the bonding curve live?",
    a: "On /token/lattice. It is a two-way power curve P(s) = P0 (1 + s/S)^n with a 1% maximum protocol fee. Sell is the inverse integral of buy. It does not hold URUU.",
  },
  {
    q: "Is URUU an investment?",
    a: "No. Aetherion makes no price, revenue, or return claims. These pages document a live contract and a presentational curve. They are not an offer, solicitation, or financial advice.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Tokenomics", item: `${SITE}/tokenomics` },
      { "@type": "ListItem", position: 3, name: "URUU", item: `${SITE}/token/uruu` },
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

export default function TokenUruu() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="URUU — Live zkSync Era Token, Custom Bonding Curve Calculator"
        description="URUU is live on zkSync Era. The wrap and custom two-way bonding curve are calculators only (1% fee cap). Not a live market."
        path="/token/uruu"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/tokenomics" className="hover:text-foreground">Tokenomics</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">URUU</span>
        </nav>

        <header className="mb-10">
          <Badge variant="outline" className="mb-4 text-[10px] uppercase tracking-widest">
            {URUU_CHAIN} · token live
          </Badge>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            URUU
          </h1>
          <p className="text-lg text-muted-foreground">
            Immutable {URUU_STANDARD} on {URUU_CHAIN}. The token is live. The
            wrap into wURUU and the custom bonding curve are not — they are
            a rule sheet and a calculator until exit is as public as entry.
          </p>
        </header>

        <div className="mb-8">
          <UruuContractCard />
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
            <p className="mt-3 text-xs text-muted-foreground">
              Explorer:{" "}
              <a href={URUU_EXPLORER} className="text-primary hover:underline" target="_blank" rel="noreferrer">
                {URUU_EXPLORER.replace("https://", "")}
              </a>
            </p>
          </CardContent>
        </Card>

        <article className="space-y-10">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <Link2 className="h-5 w-5" /> Lattice role
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              URUU is the zkSync-side asset the lattice wraps into{" "}
              <Link to="/token/wuruu" className="text-primary hover:underline">wURUU</Link>{" "}
              on Solana, priced off the{" "}
              <Link to="/token/skynt" className="text-primary hover:underline">SKYNT/WETH</Link>{" "}
              pair. See the{" "}
              <Link to="/token/lattice" className="text-primary hover:underline">custom bonding curve</Link>{" "}
              for two-way quotes with a 1% maximum fee.
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-gold">
              <ShieldCheck className="h-5 w-5" /> Disclosure
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              Aetherion makes no price, revenue, or return claims. A live
              token contract is not a live market, not a wrap, and not an
              offer to buy or sell.
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
              { label: "Buy URUU", href: "/buy/uruu" },
              { label: "wURUU on Solana", href: "/token/wuruu" },
              { label: "SKYNT on Ethereum", href: "/token/skynt" },
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

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/buy/uruu">
              Buy URUU guide
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/token/lattice">
              Open the bonding curve
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
