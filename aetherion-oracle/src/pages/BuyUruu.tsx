// /buy/uruu — SEO landing for "buy URUU" intent.
// Presentational. Token is live. Wrap, curve, and pool are calculators only.
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ShoppingCart, ShieldCheck } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import UruuContractCard from "@/components/UruuContractCard";
import BondingCurvePanel from "@/components/BondingCurvePanel";
import VolumeMoonshotPanel from "@/components/VolumeMoonshotPanel";
import CurveReferralHub from "@/components/CurveReferralHub";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUtm } from "@/hooks/useUtm";
import { captureReferralFromSearch } from "@/lib/curveShare";
import { useEffect } from "react";
import {
  URUU_ADDRESS,
  URUU_CHAIN,
  URUU_EXPLORER,
  URUU_TICK,
  uruuShort,
} from "@/lib/uruu";
import { MAX_PROTOCOL_FEE_PERCENT } from "@/lib/fairLattice";

const SITE = "https://www.excaliburcrypto.com";

const STEPS = [
  {
    n: "1",
    title: "Verify the live contract",
    body: `${URUU_TICK} is an immutable ERC-20 on ${URUU_CHAIN} at ${uruuShort}. No proxy, no hidden transfer tax.`,
  },
  {
    n: "2",
    title: "Quote on the fair lattice",
    body: `The custom two-way power curve quotes buy and sell with a ${MAX_PROTOCOL_FEE_PERCENT}% maximum protocol fee each way. Calculator only until a pool is public.`,
  },
  {
    n: "3",
    title: "Exit stays open",
    body: "Sell is the inverse integral of buy — not a one-way launch trap. Round-trip cost is disclosed before you would sign.",
  },
];

const FAQS = [
  {
    q: "How do I buy URUU?",
    a: `The ${URUU_TICK} token contract is live on zkSync Era. This page does not execute swaps — it shows the verified contract, a bonding curve calculator, and how two-way quotes would work at a ${MAX_PROTOCOL_FEE_PERCENT}% fee cap. Use the explorer link to interact on-chain; do not send funds to demo addresses.`,
  },
  {
    q: "Is there a live bonding curve pool?",
    a: "No. The curve on /token/lattice and the widget at /embed/lattice are calculators only. URUU the token is live; the wrap and pool are not.",
  },
  {
    q: "What is the maximum fee?",
    a: `${MAX_PROTOCOL_FEE_PERCENT}% each way on swap input — the same on buy and sell. That is the maximum allowable extraction on this design.`,
  },
  {
    q: "Is buying URUU an investment?",
    a: "No. Aetherion makes no price, revenue, or return claims. This page is documentation and a calculator, not an offer or financial advice.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "URUU", item: `${SITE}/token/uruu` },
      { "@type": "ListItem", position: 3, name: "Buy URUU", item: `${SITE}/buy/uruu` },
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
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Buy URUU — zkSync Era Token & Bonding Curve Calculator",
    description: `How to buy URUU on ${URUU_CHAIN}. Live contract, two-way bonding curve calculator, ${MAX_PROTOCOL_FEE_PERCENT}% max fee.`,
    url: `${SITE}/buy/uruu`,
  },
];

export default function BuyUruu() {
  useUtm("buy_uruu_visit");

  useEffect(() => {
    captureReferralFromSearch(window.location.search);
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Buy URUU — Live zkSync Token, Fair Bonding Curve Calculator"
        description={`Buy URUU on ${URUU_CHAIN}: live ERC-20 contract, two-way bonding curve quotes, ${MAX_PROTOCOL_FEE_PERCENT}% max fee. Calculator only — not a live pool.`}
        path="/buy/uruu"
        ogType="website"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="buy-uruu-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/token/uruu" className="hover:text-foreground">URUU</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Buy URUU</span>
        </nav>

        <header className="mb-10">
          <Badge variant="outline" className="mb-4 text-[10px] uppercase tracking-widest">
            {URUU_CHAIN} · mainnet live
          </Badge>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            Buy URUU
          </h1>
          <p className="text-lg text-muted-foreground">
            Live {URUU_TICK} on {URUU_CHAIN}. Quote a custom two-way bonding
            curve at the disclosed {MAX_PROTOCOL_FEE_PERCENT}% fee cap before
            any pool goes live. This page does not execute trades.
          </p>
        </header>

        <div
          role="status"
          className="mb-8 rounded-md border border-gold/50 bg-gold/10 px-4 py-3 text-sm"
        >
          <strong className="text-gold">Not a live market.</strong>{" "}
          <span className="text-foreground/90">
            URUU the token is live at{" "}
            <a href={URUU_EXPLORER} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              {URUU_ADDRESS.slice(0, 10)}…
            </a>
            . The bonding curve below is a calculator. Do not send SOL or URUU to demo addresses.
            Connect MetaMask or Rainbow on zkSync Era via the{" "}
            <Link to="/bridge?mode=mainnet" className="text-primary hover:underline">
              SphinxOS zkEVM bridge
            </Link>
            {" "}(or{" "}
            <Link to="/bridge?mode=faucet-lab" className="text-primary hover:underline">
              Faucet lab
            </Link>
            ).
          </span>
        </div>

        <div className="mb-8">
          <UruuContractCard compact />
        </div>

        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-primary">
            <ShoppingCart className="h-5 w-5" /> How buying would work
          </h2>
          <div className="space-y-3">
            {STEPS.map((s) => (
              <Card key={s.n} className="bg-card/60 backdrop-blur-sm">
                <CardContent className="flex gap-4 p-4">
                  <span className="font-mono text-lg text-gold">{s.n}</span>
                  <div>
                    <h3 className="text-sm font-medium">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="mb-10">
          <BondingCurvePanel />
        </div>

        <VolumeMoonshotPanel />

        <CurveReferralHub />

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-gold">
            <ShieldCheck className="h-5 w-5" /> Disclosure
          </h2>
          <p className="text-sm leading-relaxed text-foreground/90">
            Aetherion makes no price, revenue, or return claims. A live token
            contract is not a live market. This page is not an offer to buy
            or sell {URUU_TICK}.
          </p>
        </section>

        <section className="mb-10">
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

        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/token/lattice">
              Full fair lattice
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <a href={URUU_EXPLORER} target="_blank" rel="noreferrer">
              Open on Blockscout
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
