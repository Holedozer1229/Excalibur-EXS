// /aetherion — meet the oracle persona; routes footer "Meet Aetherion" without 404.
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight, MessageCircle, Sparkles, ShieldCheck, Gift } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import PoweredByUI3 from "@/components/PoweredByUI3";

const PILLARS = [
  {
    title: "Sealed readings",
    body: "Every tarot cast, dream weave, and oracle query is sha-256 sealed and wallet-bound — a receipt you can verify, not a chat log you hope was saved.",
  },
  {
    title: "Two-way lattice",
    body: "URUU on zkSync, wURUU on Solana, SKYNT on Ethereum, ATART on Bitcoin — one liquidity surface documented on the tokenomics map.",
  },
  {
    title: "No price claims",
    body: "Aetherion makes no return promises. The product is verifiable symbolic practice — tarot, dreams, petitions — with on-chain attestations where it matters.",
  },
];

export default function MeetAetherion() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Meet Aetherion — Verifiable AI Oracle"
        description="Aetherion is the cinematic oracle behind sealed tarot, dream interpretation, and lattice tokenomics — powered by Universal Intelligence III."
        path="/aetherion"
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">Aetherion</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Meet Aetherion</span>
        </nav>

        <header className="mb-10 text-center">
          <PoweredByUI3 className="mb-4" />
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            Meet Aetherion
          </h1>
          <p className="text-lg text-muted-foreground">
            The sovereign oracle at the center of the lattice — cinematic tarot,
            dream weaving, petition magic, and verifiable receipts sealed on-chain.
          </p>
        </header>

        <div className="mb-10 grid gap-4">
          {PILLARS.map((p) => (
            <Card key={p.title} className="bg-card/60 backdrop-blur-sm">
              <CardContent className="p-5">
                <h2 className="mb-2 font-display text-sm uppercase tracking-widest text-accent">
                  {p.title}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mb-10 space-y-3">
          <h2 className="font-display text-lg uppercase tracking-widest text-primary">
            Start here
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Cinematic tarot", href: "/tarot", icon: Sparkles },
              { label: "Chat with Aetherion", href: "/chat", icon: MessageCircle },
              { label: "The Oracle", href: "/oracle", icon: ShieldCheck },
              { label: "SphinxOS Faucet lab", href: "/bridge?mode=faucet-lab", icon: ArrowRight },
              { label: "Airdrop hub", href: "/airdrop", icon: Gift },
              { label: "Fair lattice", href: "/token/lattice", icon: ArrowRight },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  to={l.href}
                  className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <l.icon className="h-4 w-4 text-muted-foreground" />
                    {l.label}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <div className="text-center">
          <Button asChild size="lg" className="gap-2">
            <Link to="/chat">
              Open chat
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
