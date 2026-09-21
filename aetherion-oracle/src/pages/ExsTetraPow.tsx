// /exs — Excalibur-EXS Tetra-PoW merge into the Aetherion lattice (www.excaliburcrypto.com)
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronRight,
  ExternalLink,
  Flame,
  Shield,
  Sword,
  Zap,
} from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import PoweredByUI3 from "@/components/PoweredByUI3";
import SphinxOSMark from "@/components/SphinxOSMark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EXS_ALLOCATION,
  EXS_AXIOM,
  EXS_CHAIN,
  EXS_CONSENSUS,
  EXS_FORGE_REWARD,
  EXS_MAX_FORGES,
  EXS_NAME,
  EXS_PBKDF2_ITERS,
  EXS_PIPELINE,
  EXS_PROTOCOL,
  EXS_REPO,
  EXS_SITE,
  EXS_SUPPLY,
  EXS_TICK,
} from "@/lib/exs";
import { AETHERION, EXCALIBUR_EXS, LATTICE_HOST_TAGLINE } from "@/lib/brand";
import { SITE_ORIGIN, siteUrl } from "@/lib/site";
import TetraPowMiner from "@/components/TetraPowMiner";
import { EXCAL_NOT_BTC, SATOSHI_GENESIS_ADDRESS, SATOSHI_NEVER_SWEEP, TETRA_TICK } from "@/lib/tetraPow";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
      { "@type": "ListItem", position: 2, name: EXS_NAME, item: siteUrl("/exs") },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${EXS_NAME} · ${EXS_CONSENSUS}`,
    url: siteUrl("/exs"),
    description: `${EXS_PROTOCOL} on ${EXS_CHAIN}: fixed ${EXS_SUPPLY} ${EXS_TICK}, Tetra-PoW miners, merged with ${AETHERION} on ${SITE_ORIGIN}.`,
  },
];

export default function ExsTetraPow() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`${EXS_TICK} Tetra-PoW — ${EXCALIBUR_EXS} · ${AETHERION}`}
        description={`${EXS_NAME}: Proof-of-Forge + ${EXS_CONSENSUS}, ${EXS_SUPPLY} supply, hosted with Aetherion at ${SITE_ORIGIN}.`}
        path="/exs"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="exs-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/tokenomics" className="hover:text-foreground">
            Tokenomics
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{EXS_TICK}</span>
        </nav>

        <header className="mb-10">
          <SphinxOSMark className="mb-4" compact />
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              <Sword className="mr-1.5 h-3 w-3" />
              {EXS_CHAIN}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              Vercel · {SITE_ORIGIN.replace("https://", "")}
            </Badge>
          </div>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            {EXS_NAME}
          </h1>
          <p className="text-lg text-muted-foreground">
            {LATTICE_HOST_TAGLINE}. {AETHERION} Oracle hosts on this domain and merges divinatory
            EXCALIBUR mining with {EXS_PROTOCOL} — prophecy → {EXS_CONSENSUS} → Taproot.
          </p>
        </header>

        <div
          role="status"
          className="mb-8 rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm"
        >
          <strong className="text-amber-300">Lattice merge.</strong>{" "}
          <span className="text-foreground/90">
            This Vercel app is the public face of {EXCALIBUR_EXS} at {SITE_ORIGIN}. Upstream miners
            and forge API live in the{" "}
            <a href={EXS_REPO} className="text-primary hover:underline" target="_blank" rel="noreferrer">
              Excalibur-EXS repository
            </a>
            . Aetherion readings still seal ATART/AETX on Bitcoin; EXS forges mint via Tetra-PoW.
          </span>
        </div>

        <div className="mb-10">
          <TetraPowMiner />
          <p className="mt-3 text-xs text-muted-foreground">
            This miner mints ledger {TETRA_TICK} on this origin. It is not the funded L1 ERC-20 until
            CREATE2 is gas-paid. Satoshi guest {SATOSHI_GENESIS_ADDRESS} is attested only.{" "}
            {SATOSHI_NEVER_SWEEP} {EXCAL_NOT_BTC}
          </p>
        </div>

        <section className="mb-10 grid gap-3 sm:grid-cols-2">
          {[
            { k: "Ticker", v: EXS_TICK },
            { k: "Consensus", v: EXS_CONSENSUS },
            { k: "Protocol", v: EXS_PROTOCOL },
            { k: "Supply", v: EXS_SUPPLY },
            { k: "Forge reward", v: `${EXS_FORGE_REWARD} ${EXS_TICK}` },
            { k: "Max forges", v: EXS_MAX_FORGES.toLocaleString() },
            { k: "HPP-1 PBKDF2", v: `${EXS_PBKDF2_ITERS.toLocaleString()} iters` },
            { k: "Host", v: "Vercel · www" },
          ].map((f) => (
            <Card key={f.k} className="bg-card/60">
              <CardContent className="flex justify-between gap-2 p-4 font-mono text-xs">
                <span className="text-muted-foreground">{f.k}</span>
                <span className="text-right">{f.v}</span>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-primary">
            <Zap className="h-5 w-5" />
            Proof-of-Forge pipeline
          </h2>
          <ol className="space-y-2">
            {EXS_PIPELINE.map((step, i) => (
              <li
                key={step}
                className="flex items-center gap-3 rounded-md border border-border bg-card/40 px-4 py-3 text-sm"
              >
                <span className="font-mono text-xs text-accent">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-gold">
            <Flame className="h-5 w-5" />
            13-word axiom
          </h2>
          <p className="mb-2 text-sm text-muted-foreground">
            Public protocol constant — every forge begins here:
          </p>
          <code className="block rounded-md border border-border bg-background/60 p-4 font-mono text-xs leading-relaxed text-foreground/90">
            {EXS_AXIOM}
          </code>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-accent">
            <Shield className="h-5 w-5" />
            Allocation
          </h2>
          <ul className="space-y-2">
            {EXS_ALLOCATION.map((a) => (
              <li
                key={a.label}
                className="flex items-center justify-between gap-3 rounded-md border border-border px-4 py-2 text-sm"
              >
                <span>{a.label}</span>
                <span className="font-mono text-xs text-muted-foreground">
                  {a.pct}% · {a.amount}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10 space-y-3">
          <h2 className="font-display text-xl uppercase tracking-widest">Merge map</h2>
          <p className="text-sm text-muted-foreground">
            {AETHERION} divinatory EXCALIBUR attestations (Arbitrum → AETX on Bitcoin) sit beside
            EXS Tetra-PoW forges. Same Excalibur mythos, two mint paths — practice seals vs Proof-of-Forge.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "EXCALIBUR mining ritual", href: "/mining" },
              { label: "Camelot Fair · Rise of Excalibur", href: "/camelot-fair" },
              { label: "War Chest command", href: "/war-chest" },
              { label: "AETX on Bitcoin", href: "/token/aetx" },
              { label: "Full tokenomics", href: "/tokenomics" },
              { label: "Airdrop hub", href: "/airdrop" },
              { label: "SphinxOS Bridge", href: "/bridge?mode=mainnet" },
              { label: "Faucet lab", href: "/bridge?mode=faucet-lab" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm hover:bg-muted"
                >
                  <span>{l.label}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" className="gap-2">
            <a href={EXS_REPO} target="_blank" rel="noreferrer">
              EXS repository
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/mining">
              Open mining
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost" className="gap-2">
            <a href={EXS_SITE} target="_blank" rel="noreferrer">
              {EXS_SITE.replace("https://", "")}
            </a>
          </Button>
        </div>

        <PoweredByUI3 className="mt-8" />
      </main>
      <SiteFooter />
    </div>
  );
}
