// /rollup — mainnet zkEVM rollup command center: Solana lattice + zkEVM + URUU + B2B
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Coins, Cpu, Layers, Rocket, ShieldCheck, Sparkles, Zap,
} from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import RollupStatusPanel from "@/components/rollup/RollupStatusPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FAIR_LATTICE_PROGRAM_ID } from "@/lib/solana/fairLatticeProgram";
import { URUU_EXPLORER, uruuShort } from "@/lib/uruu";
import { DEFAULT_BRIDGE_MODE, BRIDGE_PROFILES } from "@/lib/bridgeNetworks";
import { calculatePotentialProfit, LATTICE_MOON_PRESET } from "@/lib/potentialProfit";
import type { RollupLegStatus } from "@/lib/zkevmRollup";
import { Connection } from "@solana/web3.js";
import TreasureFundingPanel from "@/components/pirate/TreasureFundingPanel";

const MOON = calculatePotentialProfit({
  founderSeats: 50,
  bountyClicks: 200,
  moonshot: LATTICE_MOON_PRESET,
});

const RAILS = [
  {
    id: "solana",
    title: "Fair lattice · Solana",
    icon: Cpu,
    href: "/token/lattice",
    cta: "Swap on lattice",
    detail: `Program ${FAIR_LATTICE_PROGRAM_ID.toBase58().slice(0, 8)}… · devnet live · mainnet pending fund`,
    tag: "Lattice",
  },
  {
    id: "zkevm",
    title: "SphinxOS · zkEVM mainnet",
    icon: Layers,
    href: `/bridge?mode=${DEFAULT_BRIDGE_MODE}`,
    cta: "Engage zkEVM",
    detail: `${BRIDGE_PROFILES[DEFAULT_BRIDGE_MODE].title} · zkSync Era 324 + Polygon zkEVM 1101`,
    tag: "Mainnet",
  },
  {
    id: "uruu",
    title: "URUU · live ERC-20",
    icon: Coins,
    href: "/buy/uruu",
    cta: "Buy URUU",
    detail: `${uruuShort} · bonding curve on zkSync Era`,
    tag: "Token",
  },
  {
    id: "deliberation",
    title: "Proof-of-Deliberation",
    icon: ShieldCheck,
    href: "/enterprise/deliberation",
    cta: "Seal B2B receipt",
    detail: "Dwell + scroll + clauses → sha-256 audit artifact",
    tag: "B2B",
  },
  {
    id: "artifacts",
    title: "Verifiable AI artifacts",
    icon: Sparkles,
    href: "/tarot",
    cta: "Cast free tarot",
    detail: "Wallet-bound · replay-protected receipts",
    tag: "Flagship",
  },
  {
    id: "moon",
    title: "Lattice moonshot",
    icon: Rocket,
    href: "/token/lattice#moonshot",
    cta: "Volume math",
    detail: `~${Math.round(MOON.latticeFeesYearlySol).toLocaleString()} SOL/yr hypothetical @ moon preset`,
    tag: "Math",
  },
];

async function probeSolanaProgram(rpc: string): Promise<boolean> {
  const conn = new Connection(rpc, "confirmed");
  const info = await conn.getAccountInfo(FAIR_LATTICE_PROGRAM_ID);
  return info != null && info.executable;
}

export default function DevnetRollup() {
  const [solanaMainnet, setSolanaMainnet] = useState<boolean | null>(null);
  const [solanaDevnet, setSolanaDevnet] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [mainnet, devnet] = await Promise.all([
          probeSolanaProgram("https://api.mainnet-beta.solana.com").catch(() => false),
          probeSolanaProgram("https://api.devnet.solana.com").catch(() => false),
        ]);
        setSolanaMainnet(mainnet);
        setSolanaDevnet(devnet);
      } catch {
        setSolanaMainnet(false);
        setSolanaDevnet(false);
      }
    })();
  }, []);

  const solanaStatus: RollupLegStatus =
    solanaMainnet ? "live" : solanaDevnet ? "pending" : "pending";

  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Mainnet zkEVM Rollup — Command Center | Aetherion"
        description="SphinxOS mainnet zkEVM rollup: zkSync Era, Polygon zkEVM, Solana fair lattice, live URUU, B2B proof-of-deliberation — one command center."
        path="/rollup"
        ogType="website"
      />

      <main className="relative z-10 mx-auto max-w-4xl px-5 py-12 md:py-20" data-testid="devnet-rollup-page">
        <header className="mb-10 text-center">
          <Badge className="mb-3 gap-1 bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-violet-100">
            <Zap className="h-3 w-3" />
            Mainnet zkEVM rollup · Solana lattice
          </Badge>
          <h1 className="font-saga text-4xl md:text-5xl">
            Everything live.{" "}
            <span className="bg-gradient-to-r from-cyan-300 via-fuchsia-200 to-violet-200 bg-clip-text text-transparent">
              One screen.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            zkEVM mainnet rails · Solana program · live URUU · B2B deliberation seals · verifiable tarot —
            tap a rail and ship.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-mono">
            <Badge variant="outline">
              Solana mainnet:{" "}
              {solanaMainnet === null ? "checking…" : solanaMainnet ? "program live" : "fund wallet"}
            </Badge>
            <Badge variant="outline">
              Solana devnet: {solanaDevnet === null ? "…" : solanaDevnet ? "live" : "pending"}
            </Badge>
            <Badge variant="outline">zkEVM: {DEFAULT_BRIDGE_MODE}</Badge>
            <Badge variant="outline">URUU: zkSync Era</Badge>
          </div>
        </header>

        <RollupStatusPanel solanaStatus={solanaStatus} className="mb-6" />
        <TreasureFundingPanel compact className="mb-8" />

        <div className="grid gap-3 sm:grid-cols-2">
          {RAILS.map((rail) => (
            <Card
              key={rail.id}
              className="border-border/60 bg-card/40 backdrop-blur transition-colors hover:border-primary/40"
              data-testid={`rollup-rail-${rail.id}`}
            >
              <CardContent className="flex h-full flex-col p-5">
                <div className="mb-2 flex items-center justify-between">
                  <rail.icon className="h-5 w-5 text-primary" />
                  <Badge variant="outline" className="text-[9px] uppercase">
                    {rail.tag}
                  </Badge>
                </div>
                <h2 className="font-saga text-lg">{rail.title}</h2>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{rail.detail}</p>
                <Button asChild size="sm" className="mt-4 w-full gap-1">
                  <Link to={rail.href}>
                    {rail.cta}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-8 border-amber-500/30 bg-gradient-to-br from-violet-600/10 to-fuchsia-600/5">
          <CardContent className="p-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Moon preset · illustrative protocol fees
            </p>
            <p className="mt-2 font-mono text-3xl text-primary">
              {Math.round(MOON.latticeFeesYearlySol).toLocaleString()} SOL / year
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              + ${MOON.founderMrrMonthly.toLocaleString()}/mo if 50 founders lock tonight · not financial advice
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={URUU_EXPLORER} target="_blank" rel="noreferrer">
                  URUU on explorer
                </a>
              </Button>
              <Button asChild size="sm">
                <Link to="/overnight">Overnight velocity</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Runbook: <code className="text-[10px]">npm run deploy:runbook</code> ·{" "}
          <code className="text-[10px]">npm run deploy:mainnet</code> ·{" "}
          <Link to="/black-pearl" className="text-primary hover:underline">
            Black Pearl booty
          </Link>
          {" · "}
          <Link to="/enterprise/deliberation" className="text-primary hover:underline">
            B2B demo
          </Link>
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
