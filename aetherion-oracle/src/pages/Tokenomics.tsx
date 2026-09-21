// /tokenomics — full Aetherion lattice: Bitcoin · Ethereum · zkSync Era · Solana.
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Coins,
  ShieldCheck,
  Layers,
  Flame,
  ChevronRight,
  Gift,
  Percent,
} from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import PoweredByUI3 from "@/components/PoweredByUI3";
import SphinxOSMark from "@/components/SphinxOSMark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AetxDeployStatus from "@/components/AetxDeployStatus";
import UruuContractCard from "@/components/UruuContractCard";
import CrossChainMap from "@/components/CrossChainMap";
import {
  INTENDED_FEE_PERCENT,
  MAX_PROTOCOL_FEE_PERCENT,
  DEFAULT_SOL_RESERVE,
  DEFAULT_WURUU_RESERVE,
} from "@/lib/fairLattice";
import { URUU_ADDRESS, URUU_CHAIN, URUU_TICK, uruuShort } from "@/lib/uruu";
import { AETHERION_X_SPHINX } from "@/lib/brand";

const SITE = "https://www.excaliburcrypto.com";

const TOKENS = [
  {
    tick: "ATART",
    name: "Aetherion Tarot Token",
    chain: "Bitcoin · BRC-20 · mainnet",
    supply: "21,000,000",
    mint: "+1 ATART per verified tarot reading",
    role: "Practice receipt — accumulate as you cast, claim when ready.",
    color: "text-gold",
    href: "/claim/tart",
    status: "Live claim",
  },
  {
    tick: "AETX",
    name: "Aetherion Excalibur",
    chain: "Bitcoin · BRC-20 · mainnet",
    supply: "21,000,000",
    mint: "Mining rounds + founder airdrop eligibility",
    role: "Coordination seal — EXCALIBUR round attestation on Bitcoin.",
    color: "text-primary",
    href: "/token/aetx",
    status: "Mainnet BRC-20",
  },
  {
    tick: "EXCALIBUR",
    name: "Mining Receipt",
    chain: "Arbitrum One",
    supply: "Uncapped, round-emitted",
    mint: "Emitted per divinatory event",
    role: "Non-financial proof-of-practice. Free-tier friendly.",
    color: "text-accent",
    href: "/mining",
    status: "Live ritual",
  },
  {
    tick: "URUU",
    name: "Lattice bridge asset",
    chain: `${URUU_CHAIN} · ERC-20 · mainnet`,
    supply: "100,000,000",
    mint: `Immutable · ${uruuShort}`,
    role: "Live mainnet token. Wrap & bonding curve calculators only until pool is public.",
    color: "text-primary",
    href: "/token/uruu",
    status: "Mainnet live",
  },
  {
    tick: "SKYNT",
    name: "Ethereum depth anchor",
    chain: "Ethereum · ERC-20 · mainnet",
    supply: "See pair",
    mint: "SKYNT/WETH pool depth → P₀ floor",
    role: "Reference floor for the custom Solana bonding curve.",
    color: "text-primary",
    href: "/token/skynt",
    status: "Mainnet pair",
  },
  {
    tick: "wURUU",
    name: "Solana wrap",
    chain: "Solana · SPL",
    supply: "Curve-quoted",
    mint: "Opt-in wrap of URUU — not live custody",
    role: `Custom curve P(s)=P₀(1+s/S)ⁿ · ${MAX_PROTOCOL_FEE_PERCENT}% fee cap.`,
    color: "text-accent",
    href: "/token/wuruu",
    status: "Staged wrap",
  },
  {
    tick: "EXS",
    name: "Excalibur-EXS",
    chain: "EXS Tetra-PoW · Proof-of-Forge",
    supply: "21,000,000",
    mint: "50 EXS per successful Tetra-PoW forge",
    role: "Host-chain merge at www.excaliburcrypto.com — prophecy → Tetra-PoW → Taproot.",
    color: "text-amber-300",
    href: "/exs",
    status: "Lattice host",
  },
];

const LATTICE_FACTS = [
  { k: "Max fee", v: `${MAX_PROTOCOL_FEE_PERCENT}% each way` },
  { k: "Intended fee", v: `${INTENDED_FEE_PERCENT}%` },
  { k: "Demo SOL reserve", v: `${DEFAULT_SOL_RESERVE.toLocaleString()} SOL` },
  { k: "Demo wURUU reserve", v: DEFAULT_WURUU_RESERVE.toLocaleString() },
  { k: "URUU mainnet", v: URUU_TICK },
  { k: "Contract", v: uruuShort },
];

const FAQS = [
  {
    q: "Is ATART a security or an investment?",
    a: "No. ATART is a practice receipt: one token per verified tarot reading. Aetherion makes no revenue, price, or return claims.",
  },
  {
    q: "How is AETX different from ATART?",
    a: "ATART accrues from readings; AETX is minted by EXCALIBUR mining rounds and founder airdrop eligibility. Both are BRC-20 on Bitcoin mainnet.",
  },
  {
    q: "Is URUU live on mainnet?",
    a: `Yes. URUU is a live ERC-20 on ${URUU_CHAIN} at ${URUU_ADDRESS}. The wrap to Solana and the bonding-curve pool are not live custody products yet.`,
  },
  {
    q: "What is the fair lattice fee?",
    a: `Maximum ${MAX_PROTOCOL_FEE_PERCENT}% of swap input each way. Intended operating fee ${INTENDED_FEE_PERCENT}%. Sell is the inverse of buy — two-way by design.`,
  },
  {
    q: "Where is the airdrop?",
    a: "Founder AETX eligibility and ATART claims live at /airdrop. Claims inscribe to your Bitcoin address via /claim/aetx and /claim/tart. URUU is on the same hub as protocol mesh — buy / fair lattice, not a free spray.",
  },
  {
    q: "Can supply change?",
    a: "BRC-20 deploy ops fix max supply at inscription (21M ATART, 21M AETX). URUU supply is fixed by the zkSync Era contract.",
  },
];

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Aetherion Tokenomics — Full Lattice (Bitcoin, Ethereum, zkSync, Solana)",
    description:
      "Mainnet tokenomics for ATART, AETX, EXCALIBUR, URUU, SKYNT, and wURUU — supply, fees, fair launch, and airdrop paths.",
    mainEntityOfPage: `${SITE}/tokenomics`,
    author: { "@type": "Organization", name: "Aetherion Oracle" },
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

const Tokenomics = () => {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title="Aetherion Tokenomics — Mainnet Lattice · ATART, AETX, URUU"
        description={`Mainnet tokenomics: ATART & AETX on Bitcoin, URUU on ${URUU_CHAIN}, SKYNT on Ethereum, wURUU curve (${MAX_PROTOCOL_FEE_PERCENT}% fee cap), founder airdrop.`}
        path="/tokenomics"
        ogType="article"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Tokenomics</span>
        </nav>

        <header className="mb-10">
          <SphinxOSMark className="mb-4" compact />
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              Tokenomics
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              Mainnet · {URUU_CHAIN}
            </Badge>
          </div>
          <h1 className="mb-4 font-display text-4xl uppercase tracking-widest gradient-neon-text md:text-5xl">
            Aetherion Tokenomics
          </h1>
          <p className="text-lg text-muted-foreground">
            One lattice across Bitcoin, Ethereum, {URUU_CHAIN}, and Solana. Practice receipts
            (ATART), Excalibur seals (AETX), live mainnet URUU, and a disclosed two-way curve —
            powered by {AETHERION_X_SPHINX}.
          </p>
        </header>

        <div
          role="status"
          className="mb-8 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm"
        >
          <strong className="text-primary">Mainnet status.</strong>{" "}
          <span className="text-foreground/90">
            URUU is live on {URUU_CHAIN}. ATART/AETX claim on Bitcoin mainnet. Solana wrap and curve
            pool are staged — use{" "}
            <Link to="/bridge?mode=faucet-lab" className="text-primary hover:underline">
              Faucet lab
            </Link>{" "}
            to dry-run wallets, or{" "}
            <Link to="/bridge?mode=mainnet" className="text-primary hover:underline">
              Mainnet bridge
            </Link>{" "}
            to connect MetaMask/Rainbow on chain 324.
          </span>
        </div>

        <div className="mb-8 space-y-4">
          <AetxDeployStatus />
          <UruuContractCard compact />
        </div>

        <section className="mb-10" aria-labelledby="lattice-fees">
          <div className="mb-3 flex items-center gap-2">
            <Percent className="h-4 w-4 text-accent" />
            <h2 id="lattice-fees" className="font-display text-sm uppercase tracking-widest text-accent">
              Fair lattice · disclosed fees
            </h2>
          </div>
          <Card className="border-accent/30 bg-card/60">
            <CardContent className="grid gap-2 p-4 sm:grid-cols-2">
              {LATTICE_FACTS.map((f) => (
                <div key={f.k} className="flex justify-between gap-2 font-mono text-xs">
                  <span className="text-muted-foreground">{f.k}</span>
                  <span className="text-right">{f.v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Demo reserves are illustrative. See{" "}
            <Link to="/token/lattice" className="text-primary hover:underline">
              /token/lattice
            </Link>{" "}
            for the calculator.
          </p>
        </section>

        <section className="mb-12 grid gap-4 sm:grid-cols-2">
          {TOKENS.map((t) => (
            <Card key={t.tick} className="bg-card/60 backdrop-blur-sm">
              <CardContent className="space-y-2 p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Coins className={`h-4 w-4 ${t.color}`} />
                    <span className={`font-mono text-lg ${t.color}`}>{t.tick}</span>
                  </div>
                  <Badge variant="outline" className="text-[9px] uppercase tracking-widest">
                    {t.status}
                  </Badge>
                </div>
                <div className="font-mono text-xs text-muted-foreground">{t.chain}</div>
                <h2 className="font-display text-sm uppercase tracking-widest">{t.name}</h2>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Supply</dt>
                    <dd className="font-mono">{t.supply}</dd>
                  </div>
                  <div>
                    <dt className="mt-2 text-xs text-muted-foreground">Mint</dt>
                    <dd className="text-xs">{t.mint}</dd>
                  </div>
                  <div>
                    <dt className="mt-2 text-xs text-muted-foreground">Role</dt>
                    <dd className="text-xs">{t.role}</dd>
                  </div>
                </dl>
                <Button asChild variant="ghost" size="sm" className="mt-2 w-full justify-between">
                  <Link to={t.href}>
                    Details <ArrowRight className="h-3 w-3" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <article className="space-y-10">
          <CrossChainMap />

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-gold">
              <Gift className="h-5 w-5" /> Airdrop & founder seats
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-foreground/90 md:text-base">
              First <strong>500 founder seats</strong> lock founder pricing and{" "}
              <strong>AETX airdrop eligibility</strong>. ATART accrues from verified readings. Claim
              both on Bitcoin mainnet — never send funds to undocumented addresses.
            </p>
            <Button asChild className="gap-2">
              <Link to="/airdrop">
                Open airdrop hub
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-gold">
              <Layers className="h-5 w-5" /> The practice loop
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-foreground/90 md:text-base">
              Every reading on the{" "}
              <Link to="/tarot" className="text-primary hover:underline">
                tarot engine
              </Link>{" "}
              emits +1 ATART. Claim at{" "}
              <Link to="/claim/tart" className="text-primary hover:underline">
                /claim/tart
              </Link>
              . EXCALIBUR attestations on Arbitrum close into AETX round seals. Live URUU sits on{" "}
              {URUU_CHAIN} as the lattice bridge asset.{" "}
              <Link to="/camelot-fair" className="text-primary hover:underline">
                Camelot Fair: Rise of Excalibur
              </Link>{" "}
              gamifies the same loop — stack quests on the{" "}
              <Link to="/war-chest" className="text-primary hover:underline">
                War Chest
              </Link>{" "}
              and recruit via the{" "}
              <Link to="/bounty" className="text-primary hover:underline">
                Bounty Board
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-primary">
              <ShieldCheck className="h-5 w-5" /> Distribution & fair-launch
            </h2>
            <p className="mb-3 text-sm leading-relaxed text-foreground/90 md:text-base">
              No team allocation, no pre-mine, no investor round on ATART/AETX mint paths. URUU is
              an immutable mainnet ERC-20 — wrap remains opt-in and not live.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-foreground/90">
              <li>
                <strong>Zero pre-mine</strong> on ATART — minted by readings only.
              </li>
              <li>
                <strong>Zero team allocation</strong> on AETX — rounds + founder eligibility.
              </li>
              <li>
                <strong>Disclosed curve fee</strong> — {MAX_PROTOCOL_FEE_PERCENT}% cap, never higher.
              </li>
              <li>
                <strong>Public inscriptions</strong> — auditable on any BRC-20 indexer.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-2 font-display text-2xl uppercase tracking-widest text-accent">
              <Flame className="h-5 w-5" /> Utility, not speculation
            </h2>
            <p className="text-sm leading-relaxed text-foreground/90 md:text-base">
              These tokens are receipts. Their value is that they make divinatory practice
              auditable across time. Aetherion makes no price, revenue, or return claims.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-display text-2xl uppercase tracking-widest text-gold">
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
              { label: "EXS Tetra-PoW", href: "/exs" },
              { label: "Camelot Fair game", href: "/camelot-fair" },
              { label: "War Chest command", href: "/war-chest" },
              { label: "Knight's Bounty Board", href: "/bounty" },
              { label: "Airdrop hub", href: "/airdrop" },
              { label: "Buy URUU (mainnet)", href: "/buy/uruu" },
              { label: "SphinxOS Mainnet bridge", href: "/bridge?mode=mainnet" },
              { label: "SphinxOS Faucet lab", href: "/bridge?mode=faucet-lab" },
              { label: "Claim ATART", href: "/claim/tart" },
              { label: "Claim AETX", href: "/claim/aetx" },
              { label: "Fair lattice curve", href: "/token/lattice" },
              { label: "EXCALIBUR mining", href: "/mining" },
              { label: "Cast a reading", href: "/tarot" },
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
            <Link to="/airdrop">
              <Gift className="h-4 w-4" />
              Airdrop
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="gap-2">
            <Link to="/buy/uruu">
              Buy URUU
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <PoweredByUI3 className="mt-8 text-center" />
      </main>
      <SiteFooter />
    </div>
  );
};

export default Tokenomics;
