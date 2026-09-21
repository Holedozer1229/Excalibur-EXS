// /airdrop — Aetherion founder AETX eligibility + practice-receipt claims.
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  Flame,
  Gift,
  ShieldCheck,
  Sparkles,
  Bitcoin,
  Droplets,
  Link2,
} from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import PoweredByUI3 from "@/components/PoweredByUI3";
import SphinxOSMark from "@/components/SphinxOSMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AETHERION, SPHINX_OS } from "@/lib/brand";
import { FOUNDER_ECONOMICS, founderAuthHref } from "@/lib/founderEconomics";
import { URUU_CHAIN, URUU_TICK, uruuShort } from "@/lib/uruu";

const SITE = "https://www.excaliburcrypto.com";
const FOUNDER_SEATS = FOUNDER_ECONOMICS.seatCap;

const STEPS = [
  {
    n: "1",
    title: "Claim a founder seat",
    body: `First ${FOUNDER_SEATS} Stripe founder seats lock ${FOUNDER_ECONOMICS.labelFirst} first month → ${FOUNDER_ECONOMICS.labelRenew}/mo and AETX airdrop eligibility. Sign in to start.`,
    href: founderAuthHref("airdrop"),
    cta: "Claim founder seat",
  },
  {
    n: "2",
    title: "Practice on the lattice",
    body: "Cast sealed tarot, mine EXCALIBUR rounds, and accumulate ATART practice receipts. Eligibility tracks verified activity — not a paid whitelist.",
    href: "/tarot",
    cta: "Cast a reading",
  },
  {
    n: "3",
    title: "Claim on Bitcoin",
    body: "Inscribe earned AETX or ATART as BRC-20 to a wallet you control. Aetherion never custody-holds your claim destination.",
    href: "/claim/aetx",
    cta: "Open AETX claim",
  },
  {
    n: "4",
    title: "Optional · Faucet lab",
    body: `${SPHINX_OS} faucet lab dry-runs zkEVM ↔ Solana with public drips. Separate from the Bitcoin airdrop — use it to test lattice wallets.`,
    href: "/bridge?mode=faucet-lab",
    cta: "Open Faucet lab",
  },
];

const STREAMS = [
  {
    tick: "AETX",
    title: "Founder airdrop eligibility",
    chain: "Bitcoin · BRC-20",
    blurb:
      "Founder seats unlock AETX airdrop eligibility. Mining rounds mint AETX as round seals — claim when your balance is ready.",
    href: "/claim/aetx",
    accent: "text-primary",
    cta: "Claim AETX",
  },
  {
    tick: "ATART",
    title: "Practice receipts",
    chain: "Bitcoin · BRC-20",
    blurb:
      "Every verified tarot reading accrues +1 ATART. Claim anytime to inscribe receipts you already earned — not a speculative drop.",
    href: "/claim/tart",
    accent: "text-gold",
    cta: "Claim ATART",
  },
];

/** zkSync lattice asset — buy / fair lattice path, not a free spray. */
const PROTOCOL_MESH = [
  {
    tick: URUU_TICK,
    title: "Lattice bridge asset",
    chain: `${URUU_CHAIN} · ERC-20 · Camelot liquidity`,
    blurb: `Live mainnet token at ${uruuShort}. No free URUU spray — acquire via the fair lattice calculator or on-chain liquidity. Wrap and curve are calculators only.`,
    href: "/token/uruu",
    buyHref: "/buy/uruu",
    latticeHref: "/token/lattice",
    accent: "text-accent",
  },
];

const RULES = [
  "No purchase required to cast a free sealed reading from the homepage.",
  "Founder pricing (first 50 — $5.99 first month, then $49.99/mo) includes AETX airdrop eligibility — not a guaranteed allocation amount.",
  "ATART is earned only by verified readings; AETX by mining rounds / founder eligibility.",
  "URUU is live on zkSync Era — not a Bitcoin airdrop. No free URUU allocation; use /buy/uruu and the fair lattice for on-chain paths.",
  "Claims inscribe to your BTC address. Wrong address = lost inscription.",
  "Aetherion makes no price, revenue, or return claims. This is practice accounting, not an investment.",
];

const FAQS = [
  {
    q: "Is this a free token airdrop?",
    a: "ATART accrues from verified readings. AETX eligibility is tied to founder seats and mining rounds. Neither is a random wallet spray — you claim what your practice earned.",
  },
  {
    q: "How many founder seats exist?",
    a: `The first ${FOUNDER_SEATS} founder seats get ${FOUNDER_ECONOMICS.labelFirst} the first month, then ${FOUNDER_ECONOMICS.labelRenew}/mo via Stripe, plus AETX airdrop eligibility. After seats fill, standard Oracle Pro pricing applies without the coupon.`,
  },
  {
    q: "Where do I claim?",
    a: "AETX → /claim/aetx. ATART → /claim/tart. Both require sign-in and a Bitcoin address you control.",
  },
  {
    q: "Is URUU part of the airdrop?",
    a: `No free URUU spray. URUU is a live ERC-20 on ${URUU_CHAIN} (${uruuShort}) — the lattice bridge asset with Camelot liquidity. Buy or quote via /buy/uruu and /token/lattice; see /token/uruu for contract facts.`,
  },
  {
    q: "What about Solana / zkEVM faucets?",
    a: "SphinxOS Faucet lab funds testnets (Cardona, zkSync Sepolia, Solana Devnet) so you can dry-run the lattice bridge. That is not the Bitcoin airdrop and does not mint free URUU.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Airdrop", item: `${SITE}/airdrop` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Aetherion Airdrop — AETX Founder Eligibility, ATART Claims & URUU Lattice",
    url: `${SITE}/airdrop`,
    description:
      "Claim Aetherion airdrop paths: founder AETX eligibility, ATART practice receipts, live URUU on zkSync Era (buy / fair lattice), and SphinxOS faucet lab for zkEVM↔Solana dry runs.",
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

export default function Airdrop() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Airdrop — AETX, ATART & URUU Lattice | Aetherion"
        description={`Aetherion airdrop: first ${FOUNDER_SEATS} founder seats for AETX eligibility, ATART from tarot readings, claim on Bitcoin. Live URUU on ${URUU_CHAIN} via buy / fair lattice — no free spray.`}
        path="/airdrop"
        ogType="website"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="airdrop-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/tokenomics" className="hover:text-foreground">
            Tokenomics
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Airdrop</span>
        </nav>

        <header className="mb-10">
          <SphinxOSMark className="mb-4" compact />
          <Badge variant="outline" className="mb-4 text-[10px] uppercase tracking-widest">
            <Gift className="mr-1.5 h-3 w-3" />
            Airdrop · practice earned
          </Badge>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            Aetherion Airdrop
          </h1>
          <p className="text-lg text-muted-foreground">
            Two Bitcoin claim streams — <strong className="text-foreground">AETX</strong> founder
            eligibility and <strong className="text-foreground">ATART</strong> practice receipts —
            plus live <strong className="text-foreground">URUU</strong> on {URUU_CHAIN} (buy / fair
            lattice, not a free drop) and an optional {SPHINX_OS} faucet lab for lattice wallet
            dry-runs. No team pre-mine. No price promises.
          </p>
        </header>

        <div
          role="status"
          className="mb-8 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <strong className="text-amber-300">Founder seats · first {FOUNDER_SEATS}.</strong>{" "}
          <span className="text-foreground/90">
            Lock founder pricing and AETX airdrop eligibility. Unlimited sealed readings while seats
            remain.{" "}
            <Link to="/auth?from=airdrop_banner" className="text-primary hover:underline">
              Claim a seat →
            </Link>
          </span>
        </div>

        <section className="mb-10 grid gap-4 sm:grid-cols-2">
          {STREAMS.map((s) => (
            <Card key={s.tick} className="bg-card/60 backdrop-blur-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Bitcoin className={`h-4 w-4 ${s.accent}`} />
                  <span className={`font-mono text-lg ${s.accent}`}>{s.tick}</span>
                </div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {s.chain}
                </p>
                <h2 className="font-display text-sm uppercase tracking-widest">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.blurb}</p>
                <Button asChild variant="outline" size="sm" className="w-full justify-between">
                  <Link to={s.href}>
                    {s.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-accent">
            <Link2 className="h-5 w-5" />
            Protocol mesh · {URUU_CHAIN}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            URUU is the zkSync-side lattice asset — not a Bitcoin airdrop. No guaranteed free
            allocation; acquire on-chain or quote the fair lattice.
          </p>
          <div className="grid gap-4 sm:grid-cols-1">
            {PROTOCOL_MESH.map((m) => (
              <Card key={m.tick} className="bg-card/60 backdrop-blur-sm">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <Link2 className={`h-4 w-4 ${m.accent}`} />
                    <span className={`font-mono text-lg ${m.accent}`}>{m.tick}</span>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {m.chain}
                  </p>
                  <h3 className="font-display text-sm uppercase tracking-widest">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.blurb}</p>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button asChild variant="outline" size="sm" className="flex-1 justify-between">
                      <Link to={m.buyHref}>
                        Buy URUU
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" size="sm" className="flex-1 justify-between">
                      <Link to={m.href}>
                        Token page
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="flex-1 justify-between">
                      <Link to={m.latticeHref}>
                        Fair lattice
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-10 space-y-4">
          <h2 className="flex items-center gap-2 font-display text-xl uppercase tracking-widest text-primary">
            <Sparkles className="h-5 w-5" />
            How to participate
          </h2>
          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li
                key={s.n}
                className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex gap-3">
                  <span className="font-mono text-sm text-accent">{s.n}</span>
                  <div>
                    <h3 className="font-display text-sm uppercase tracking-widest">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                  </div>
                </div>
                <Button asChild size="sm" variant="secondary" className="shrink-0 gap-1">
                  <Link to={s.href}>
                    {s.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-gold">
            <ShieldCheck className="h-5 w-5" />
            Rules
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
            {RULES.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="mb-4 font-display text-xl uppercase tracking-widest">FAQ</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <Card key={f.q} className="bg-card/50">
                <CardContent className="space-y-2 p-4">
                  <h3 className="text-sm font-medium">{f.q}</h3>
                  <p className="text-sm text-muted-foreground">{f.a}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="gap-2">
            <Link to="/claim/aetx">
              <Flame className="h-4 w-4" />
              Claim AETX
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/claim/tart">Claim ATART</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/buy/uruu">
              <Link2 className="h-4 w-4" />
              Buy URUU
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/bridge?mode=faucet-lab">
              <Droplets className="h-4 w-4" />
              Faucet lab
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="gap-2">
            <Link to="/tokenomics">
              Full tokenomics
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <p className="mt-8 text-[11px] text-muted-foreground">
          {AETHERION} airdrop surfaces are documentation of earned balances — not an offer,
          solicitation, or financial product.
        </p>
        <PoweredByUI3 className="mt-4" />
      </main>
      <SiteFooter />
    </div>
  );
}
