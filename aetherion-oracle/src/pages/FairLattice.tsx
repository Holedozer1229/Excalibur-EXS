// /token/lattice — custom two-way bonding curve + fair wrap rules.
// Presentational. URUU token is live. Wrap and curve are not.
import { lazy, Suspense, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, ShieldCheck, Scale, Ban, Unlock } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import BondingCurvePanel from "@/components/BondingCurvePanel";
import MaxExtractionPanel from "@/components/MaxExtractionPanel";
import VolumeMoonshotPanel from "@/components/VolumeMoonshotPanel";
import CurveReferralHub from "@/components/CurveReferralHub";
const SolanaLiveSection = lazy(() => import("@/components/solana/SolanaLiveSection"));
import SolanaErrorBoundary from "@/components/solana/SolanaErrorBoundary";
import { useUtm } from "@/hooks/useUtm";
import { captureReferralFromSearch } from "@/lib/curveShare";
import FairCurvePanel from "@/components/FairCurvePanel";
import UruuContractCard from "@/components/UruuContractCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PROTOCOL_FEE_PERCENT, INTENDED_FEE_PERCENT, MAX_PROTOCOL_FEE_PERCENT } from "@/lib/fairLattice";
import { URUU_EXPLORER, uruuShort } from "@/lib/uruu";

const SITE = "https://www.excaliburcrypto.com";

const RULES = [
  {
    k: "Protocol fee",
    v: `${PROTOCOL_FEE_PERCENT}% each way`,
    note: "Disclosed. Same on buy and sell. The only extraction.",
  },
  {
    k: "Curve",
    v: "Two-way power curve P(s) = P₀ (1 + s/S)ⁿ",
    note: "Sell is the inverse integral of buy. Curvature n is visible. Price impact is quoted before you would sign.",
  },
  {
    k: "Wrap",
    v: "Opt-in, 1:1, user unlock — not live",
    note: "URUU is immutable on zkSync. No transfer tax. No operator freeze. No live lock until exit is public.",
  },
  {
    k: "Relayer",
    v: "None",
    note: "No exclusive bot that can withhold a release.",
  },
];

const FORBIDDEN = [
  { power: "Sweep user deposits", why: "Locked URUU stays user-owned until they unlock." },
  { power: "One-way curve", why: "Sell is the inverse integral of buy, minus the same fee." },
  { power: "Fee above 1%", why: "1% each way is the cap. 0.3058% is the intended operating number. Clamp, don't hide." },
  { power: "Exclusive release key", why: "If it cannot be verified in public, it is not a bridge." },
];

const FAQS = [
  {
    q: "How do I maximize protocol revenue?",
    a: `Quote at the ${MAX_PROTOCOL_FEE_PERCENT}% cap each way — that is the maximum allowable extraction on this page. Two-way flow at cap yields about two fees plus impact on round-trip. The 0.3058% figure is below the cap; this calculator defaults to the maximum.`,
  },
  {
    q: "What if volume actually routes here?",
    a: "The volume moonshot panel models hypothetical daily SOL flow at the disclosed cap — not a forecast. Large upside requires large routed volume; the fee stays at 1% each way. Share the lattice link to test whether anyone shows up before a pool exists.",
  },
  {
    q: "Is this extractive?",
    a: `Yes, at the maximum this page will quote: ${PROTOCOL_FEE_PERCENT}% each way. Round-trip is about 2% plus impact. That pays for a two-way market. It is not a lock, freeze, or one-way vacuum for SOL.`,
  },
  {
    q: "What makes the curve custom?",
    a: "Spot price is P(s) = P0 · (1 + s/S)^n, with n on a slider. Buy pays the integral; sell receives the inverse integral. That is not Uniswap xy=k, and it is not a one-way launch curve that keeps the reserve.",
  },
  {
    q: "Can I get out?",
    a: "Yes. Sell wURUU back through the same curve. Round-trip cost is about two fees plus price impact. There is no time-lock and no operator permission.",
  },
  {
    q: "Why not 0%? Why not 5%?",
    a: `0% is free-ridden to death. 5% each way is an exit tax. The ceiling here is ${MAX_PROTOCOL_FEE_PERCENT}%. The 0.3058% figure is the intended operating fee — below the cap, disclosed, symmetric.`,
  },
  {
    q: "Is URUU live? Is the wrap live?",
    a: "URUU the token is live on zkSync Era. The wrap and this curve are not. Do not send URUU, SOL, or wURUU to any address shown as a demo. Live lock contracts are out of scope until exit is as public as entry.",
  },
  {
    q: "Is this an investment?",
    a: "No. Aetherion makes no price, revenue, or return claims. Nothing here is an offer, solicitation, or financial advice.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Tokenomics", item: `${SITE}/tokenomics` },
      { "@type": "ListItem", position: 3, name: "Fair lattice", item: `${SITE}/token/lattice` },
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

export default function FairLattice() {
  useUtm("curve_visit");

  useEffect(() => {
    captureReferralFromSearch(window.location.search);
  }, []);

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Fair Lattice — Custom Two-Way Bonding Curve, 1% Max Fee"
        description="Aetherion custom bonding curve: P(s)=P0(1+s/S)^n, two-way quotes, 1% max fee. URUU is live on zkSync; wrap and curve are calculators only."
        path="/token/lattice"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/tokenomics" className="hover:text-foreground">Tokenomics</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Fair lattice</span>
        </nav>

        <header className="mb-10">
          <Badge variant="outline" className="mb-4 text-[10px] uppercase tracking-widest">
            Max extraction · {MAX_PROTOCOL_FEE_PERCENT}% each way
          </Badge>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            Fair lattice
          </h1>
          <p className="text-lg text-muted-foreground">
            A custom two-way bonding curve: spot price{" "}
            <span className="font-mono text-sm">P(s) = P₀ (1 + s/S)ⁿ</span>.
            Maximum allowable extraction is {MAX_PROTOCOL_FEE_PERCENT}% of
            each swap input — the same on buy and sell. Anything above 1%
            is an exit tax. Exclusive relayers and one-way SOL traps stay
            refused.
          </p>
        </header>

        <div className="mb-8">
          <UruuContractCard compact />
        </div>

        <div
          role="status"
          className="mb-8 rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
        >
          <strong className="text-accent">Solana program live.</strong>{" "}
          <span className="text-foreground/90">
            The fair lattice Anchor program is deployed with on-chain buy/sell and referral
            attribute PDAs — powered by Universal Intelligence III. zkSync URUU wrap is still
            not live; connect a Solana wallet below to swap wURUU on devnet when the pool is
            initialized. Engage zkEVM mainnet via the{" "}
            <Link to="/bridge?mode=mainnet" className="text-primary hover:underline">
              SphinxOS bridge
            </Link>
            {" "}(or dry-run in the{" "}
            <Link to="/bridge?mode=faucet-lab" className="text-primary hover:underline">
              Faucet lab
            </Link>
            ).
          </span>
        </div>

        <SolanaErrorBoundary>
          <Suspense fallback={null}>
            <SolanaLiveSection cluster="devnet" className="mb-10" />
          </Suspense>
        </SolanaErrorBoundary>

        <Card className="mb-10 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-5">
            <dl className="divide-y divide-border text-sm">
              {RULES.map((r) => (
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

        <MaxExtractionPanel />

        <VolumeMoonshotPanel />

        <CurveReferralHub />

        <div className="mb-10">
          <BondingCurvePanel />
        </div>

        <details className="mb-10 rounded-md border border-border bg-card/40 p-4">
          <summary className="cursor-pointer font-display text-sm uppercase tracking-widest text-muted-foreground">
            Compare: constant-product AMM
          </summary>
          <p className="mb-4 mt-3 text-xs leading-relaxed text-muted-foreground">
            The previous fair-lattice quote was Uniswap-style xy=k. Same 1%
            cap, still two-way. The power curve above is the custom shape.
          </p>
          <FairCurvePanel />
        </details>

        <article className="space-y-10">
          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <Scale className="h-5 w-5" /> Maximum allowable extraction
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-foreground/90 md:text-base">
              The lattice quotes at {PROTOCOL_FEE_PERCENT}% of each swap
              input — the maximum this design will allow. Buy SOL→wURUU and
              sell wURUU→SOL pay the same rate. The {INTENDED_FEE_PERCENT}%
              “ghost” number is still the intended operating fee; it is
              below the cap. Exclusive release keys, one-way curves that
              keep all SOL, and operator sweeps of locked URUU stay refused.
            </p>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              URUU at{" "}
              <a
                className="text-primary hover:underline"
                href={URUU_EXPLORER}
                target="_blank"
                rel="noreferrer"
              >
                {uruuShort}
              </a>{" "}
              is live and immutable. There is no proxy slot, so there is no
              transfer tax on the token itself. Any wrap is opt-in and not
              live. The{" "}
              <Link to="/token/skynt" className="text-primary hover:underline">SKYNT/WETH</Link>{" "}
              pair remains a reference floor (P₀), not a gravity well that
              mints extra wURUU you cannot sell.
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-accent">
              <Ban className="h-5 w-5" /> Negative space — operator powers that do not exist
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-foreground/90 md:text-base">
              The structure is the list of things this lattice is not allowed
              to do. That constraint is the product.
            </p>
            <div className="space-y-3">
              {FORBIDDEN.map((f) => (
                <Card key={f.power} className="bg-card/60 backdrop-blur-sm">
                  <CardContent className="p-4">
                    <h3 className="mb-1 font-mono text-sm text-gold">{f.power}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{f.why}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-gold">
              <Unlock className="h-5 w-5" /> Wrap rules (when a contract exists)
            </h2>
            <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
              <li>Lock and unlock are the same user. No third-party release key.</li>
              <li>1:1 URUU in, 1:1 URUU out, minus network gas — wrap itself takes no protocol fee.</li>
              <li>The {PROTOCOL_FEE_PERCENT}% fee lives on the two-way curve, where you can see it in the quote.</li>
              <li>
                ATART remains a{" "}
                <Link to="/claim/tart" className="text-primary hover:underline">practice receipt</Link>
                , not a hidden mint bonus from a vault you cannot audit.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <ShieldCheck className="h-5 w-5" /> Disclosure
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              Aetherion makes no price, revenue, or return claims. This page
              is a rule sheet and a calculator. It is not a live market, not
              a bridge, and not an offer to buy or sell any token.
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
              { label: "wURUU on Solana", href: "/token/wuruu" },
              { label: "SKYNT on Ethereum", href: "/token/skynt" },
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

        <div className="mt-12 text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/tokenomics">
              Back to tokenomics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
