// /camelot-fair — Camelot Fair: Rise of Excalibur · lore + tokenomics merge
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Castle,
  ChevronRight,
  Crown,
  ExternalLink,
  Gamepad2,
  Scroll,
  Sparkles,
  Sword,
} from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import PoweredByUI3 from "@/components/PoweredByUI3";
import SphinxOSMark from "@/components/SphinxOSMark";
import CamelotQuestPanel from "@/components/camelot/CamelotQuestPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CAMELOT_DISTRICTS,
  CAMELOT_FAIR_FULL,
  CAMELOT_FAIR_LORE,
  CAMELOT_FAIR_PLAY_URL,
  CAMELOT_FAIR_STATUS,
  CAMELOT_FAIR_SUBTITLE,
  CAMELOT_FAIR_TAGLINE,
  CAMELOT_FAIR_TITLE,
  CAMELOT_QUEST_CHAPTERS,
} from "@/lib/camelotFair";
import { AETHERION, EXCALIBUR_CRYPTO, LATTICE_HOST_TAGLINE } from "@/lib/brand";
import { SITE_ORIGIN, siteUrl } from "@/lib/site";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
      { "@type": "ListItem", position: 2, name: CAMELOT_FAIR_TITLE, item: siteUrl("/camelot-fair") },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: CAMELOT_FAIR_FULL,
    url: siteUrl("/camelot-fair"),
    description: CAMELOT_FAIR_LORE,
    gamePlatform: "Web",
    publisher: { "@type": "Organization", name: EXCALIBUR_CRYPTO },
    isPartOf: { "@type": "WebSite", name: AETHERION, url: SITE_ORIGIN },
  },
];

export default function CamelotFair() {
  const playHref = CAMELOT_FAIR_PLAY_URL || undefined;

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`${CAMELOT_FAIR_FULL} · ${EXCALIBUR_CRYPTO}`}
        description={`${CAMELOT_FAIR_LORE} Token rails: ATART, AETX, EXS, URUU on ${SITE_ORIGIN}.`}
        path="/camelot-fair"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="camelot-fair-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/tokenomics" className="hover:text-foreground">
            Tokenomics
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{CAMELOT_FAIR_TITLE}</span>
        </nav>

        <header className="mb-10">
          <SphinxOSMark className="mb-4" compact />
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              <Castle className="mr-1.5 h-3 w-3" />
              {CAMELOT_FAIR_TITLE}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              <Sword className="mr-1.5 h-3 w-3" />
              {CAMELOT_FAIR_SUBTITLE}
            </Badge>
          </div>
          <h1 className="mb-2 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            {CAMELOT_FAIR_FULL}
          </h1>
          <p className="mb-4 text-sm font-mono uppercase tracking-[0.2em] text-amber-200/90">
            {CAMELOT_FAIR_TAGLINE}
          </p>
          <p className="text-lg text-muted-foreground">{CAMELOT_FAIR_LORE}</p>
        </header>

        <div
          role="status"
          className="mb-8 rounded-md border border-violet-500/40 bg-violet-500/10 px-4 py-3 text-sm"
        >
          <strong className="text-violet-200">{CAMELOT_FAIR_STATUS}.</strong>{" "}
          <span className="text-foreground/90">
            {LATTICE_HOST_TAGLINE}. Game districts map to live lattice tokens — tarot seals, mining
            rounds, EXS forges, and URUU on zkSync.{" "}
            {playHref ? (
              <>
                Launch the play build below, or explore rails in{" "}
                <Link to="/tokenomics" className="text-primary hover:underline">
                  tokenomics
                </Link>
                .
              </>
            ) : (
              <>
                Set <code className="text-xs">VITE_CAMELOT_FAIR_URL</code> when your play build ships;
                until then, walk the fair through the routes below.
              </>
            )}
          </span>
        </div>

        <div className="mb-10 flex flex-wrap gap-3">
          {playHref ? (
            <Button asChild size="lg" className="gap-2">
              <a href={playHref} target="_blank" rel="noreferrer">
                <Gamepad2 className="h-4 w-4" />
                Play {CAMELOT_FAIR_SUBTITLE}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          ) : (
            <Button asChild size="lg" className="gap-2">
              <Link to="/tarot">
                <Sparkles className="h-4 w-4" />
                Start in the Divination Tent
              </Link>
            </Button>
          )}
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/tokenomics">
              Tokenomics map
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <section className="mb-10">
          <CamelotQuestPanel />
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-primary">
            <Scroll className="h-5 w-5" />
            {CAMELOT_FAIR_SUBTITLE} · quest arc
          </h2>
          <ol className="space-y-3">
            {CAMELOT_QUEST_CHAPTERS.map((c) => (
              <li key={c.chapter}>
                <Card className="bg-card/60">
                  <CardContent className="p-4">
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-sm uppercase tracking-widest text-gold">
                        {c.chapter}
                      </span>
                      {c.token !== "—" && (
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {c.token}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{c.beat}</p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section className="mb-10">
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl uppercase tracking-widest text-accent">
            <Crown className="h-5 w-5" />
            Fair districts → token rails
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Each district is a live route on {SITE_ORIGIN.replace("https://", "")}. Completing in-game
            acts should mirror these on-chain receipts — no shadow currencies, no undocumented mints.
          </p>
          <div className="space-y-3">
            {CAMELOT_DISTRICTS.map((d) => (
              <Card key={d.district} className="bg-card/50">
                <CardContent className="p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-display text-sm uppercase tracking-widest">{d.district}</h3>
                    <Badge className="font-mono text-[10px]">{d.token}</Badge>
                  </div>
                  <p className="mb-1 text-sm font-medium">{d.act}</p>
                  <p className="mb-3 text-xs text-muted-foreground">{d.reward}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="secondary" size="sm">
                      <Link to={d.href}>Enter district</Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm">
                      <Link to={d.claim}>Claim / details</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-10 space-y-3">
          <h2 className="font-display text-xl uppercase tracking-widest">Lattice links</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "War Chest command", href: "/war-chest" },
              { label: "Knight's Bounty Board", href: "/bounty" },
              { label: "EXS Tetra-PoW · Draw the Sword", href: "/exs" },
              { label: "EXCALIBUR mining ritual", href: "/mining" },
              { label: "Full tokenomics", href: "/tokenomics" },
              { label: "Airdrop · Founder Pavilion", href: "/airdrop" },
              { label: "SphinxOS Bridge", href: "/bridge?mode=mainnet" },
              { label: "Cast a reading", href: "/tarot" },
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

        <PoweredByUI3 className="mt-8" />
      </main>
      <SiteFooter />
    </div>
  );
}
