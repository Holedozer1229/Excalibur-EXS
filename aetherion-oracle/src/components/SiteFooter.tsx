// Global site footer — cross-linked to lift crawl depth between the
// oracle, tarot meanings, dream symbols, learn guides, and tokenomics.
// Deliberately semantic + text-heavy so it doubles as an internal-link
// hub for SEO. Mount at the bottom of the primary landing pages.

import { Link } from "react-router-dom";
import { AetherionLogo } from "@/components/brand/AetherionLogo";
import PoweredByUI3 from "@/components/PoweredByUI3";
import { MAJOR_CARDS } from "@/data/tarotCards";
import { DREAM_SYMBOLS } from "@/data/dreamSymbols";
import { LEARN_TOPICS } from "@/data/learnTopics";

interface Props {
  className?: string;
}

const SITE = "Aetherion Oracle";
const YEAR = new Date().getFullYear();

export default function SiteFooter({ className = "" }: Props) {
  // Deterministic top interlink picks — keep first few for stability + crawl.
  const featuredCards = MAJOR_CARDS.slice(0, 8);
  const featuredSymbols = DREAM_SYMBOLS.slice(0, 8);
  const featuredLearn = LEARN_TOPICS.slice(0, 6);

  return (
    <footer
      className={`relative border-t border-border/60 bg-void/40 backdrop-blur-sm ${className}`}
      aria-labelledby="site-footer-heading"
    >
      <h2 id="site-footer-heading" className="sr-only">Explore the Aetherion codex</h2>

      <div className="max-w-6xl mx-auto px-5 py-10 grid gap-8 md:grid-cols-4 md:gap-6">
        {/* Brand */}
        <div className="md:col-span-1">
          <Link to="/" className="inline-flex items-center gap-3 text-primary">
            <AetherionLogo variant="aetherion" size="sm" />
            <span className="font-display uppercase tracking-[0.32em] text-xs">{SITE}</span>
          </Link>
          <p className="mt-3 text-[12px] font-serif leading-snug text-muted-foreground/90">
            Hosted at www.excaliburcrypto.com on Excalibur-EXS Tetra-PoW. Cryptographic tarot,
            dream weaving, and the Caduceus engine — every reading sealed on-chain and yours to keep.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-widest">
            <Link to="/tokenomics" className="text-primary/80 hover:text-primary underline underline-offset-4">Tokenomics</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/airdrop" className="text-primary/80 hover:text-primary underline underline-offset-4">Airdrop</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/exs" className="text-primary/80 hover:text-primary underline underline-offset-4">EXS Tetra-PoW</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/camelot-fair" className="text-primary/80 hover:text-primary underline underline-offset-4">Camelot Fair</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/war-chest" className="text-primary/80 hover:text-primary underline underline-offset-4">War Chest</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/black-pearl" className="text-primary/80 hover:text-primary underline underline-offset-4">Black Pearl</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/mind-of-the-cosmos" className="text-primary/80 hover:text-primary underline underline-offset-4">Mind of the Cosmos</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/live-ledger" className="text-primary/80 hover:text-primary underline underline-offset-4">Live ledger</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/token/lattice" className="text-primary/80 hover:text-primary underline underline-offset-4">Fair lattice</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/token/uruu" className="text-primary/80 hover:text-primary underline underline-offset-4">URUU</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/buy/uruu" className="text-primary/80 hover:text-primary underline underline-offset-4">Buy URUU</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/bridge?mode=mainnet" className="text-primary/80 hover:text-primary underline underline-offset-4">SphinxOS zkEVM</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/bridge?mode=faucet-lab" className="text-primary/80 hover:text-primary underline underline-offset-4">Faucet lab</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/legal" className="text-muted-foreground hover:text-foreground">Legal</Link>
            <span className="text-muted-foreground/40">·</span>
            <Link to="/verify" className="text-muted-foreground hover:text-foreground">Verify a seal</Link>
          </div>
        </div>

        {/* Tarot column */}
        <nav aria-label="Tarot" className="min-w-0">
          <h3 className="font-display uppercase tracking-widest text-[10px] text-primary mb-3">Tarot</h3>
          <ul className="space-y-1.5 text-[12px]">
            <li><Link to="/tarot" className="text-foreground/90 hover:text-primary">Cinematic reading</Link></li>
            <li><Link to="/tarot/meanings" className="text-foreground/90 hover:text-primary">All 78 card meanings</Link></li>
            <li><Link to="/tarot/yes-no" className="text-foreground/90 hover:text-primary">Yes / no draw</Link></li>
            <li><Link to="/tarot/guide" className="text-foreground/90 hover:text-primary">Beginner's guide</Link></li>
          </ul>
          <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Card meanings</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
            {featuredCards.map((c) => (
              <li key={c.slug}>
                <Link to={`/tarot/meanings/${c.slug}`} className="text-muted-foreground hover:text-foreground underline underline-offset-2 decoration-border">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Dreams column */}
        <nav aria-label="Dreams" className="min-w-0">
          <h3 className="font-display uppercase tracking-widest text-[10px] text-primary mb-3">Dreams</h3>
          <ul className="space-y-1.5 text-[12px]">
            <li><Link to="/dreams" className="text-foreground/90 hover:text-primary">Bring a dream</Link></li>
            <li><Link to="/dreams/symbols" className="text-foreground/90 hover:text-primary">Symbol codex</Link></li>
            <li><Link to="/chat" className="text-foreground/90 hover:text-primary">Chat with Aetherion</Link></li>
            <li><Link to="/oracle" className="text-foreground/90 hover:text-primary">The Oracle</Link></li>
          </ul>
          <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Common symbols</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px]">
            {featuredSymbols.map((s) => (
              <li key={s.slug}>
                <Link to={`/dreams/symbols/${s.slug}`} className="text-muted-foreground hover:text-foreground underline underline-offset-2 decoration-border">
                  {s.symbol}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Learn column */}
        <nav aria-label="Learn" className="min-w-0">
          <h3 className="font-display uppercase tracking-widest text-[10px] text-primary mb-3">Learn</h3>
          <ul className="space-y-1.5 text-[12px]">
            <li><Link to="/learn" className="text-foreground/90 hover:text-primary">All guides</Link></li>
            <li><Link to="/lattice/force" className="text-foreground/90 hover:text-primary">Force Oracle</Link></li>
            <li><Link to="/lattice/loop" className="text-foreground/90 hover:text-primary">Regal loop-hole</Link></li>
            <li><Link to="/lattice/nh" className="text-foreground/90 hover:text-primary">Non-Hermitian lattice lab</Link></li>
            <li><Link to="/lattice/bit" className="text-foreground/90 hover:text-primary">It from Bit</Link></li>
            <li><Link to="/lattice/caduceus" className="text-foreground/90 hover:text-primary">Quantum Caduceus</Link></li>
            <li><Link to="/caduceus/speculative" className="text-foreground/90 hover:text-primary">Retrocausal Seal</Link></li>
            <li><Link to="/mining" className="text-foreground/90 hover:text-primary">Mining ritual</Link></li>
            <li><Link to="/exs" className="text-foreground/90 hover:text-primary">EXS Tetra-PoW</Link></li>
            <li><Link to="/wrap" className="text-foreground/90 hover:text-primary">WETH wrap</Link></li>
            <li><Link to="/camelot-fair" className="text-foreground/90 hover:text-primary">Camelot Fair</Link></li>
            <li><Link to="/war-chest" className="text-foreground/90 hover:text-primary">War Chest</Link></li>
            <li><Link to="/bounty" className="text-foreground/90 hover:text-primary">Bounty Board</Link></li>
            <li><Link to="/airdrop" className="text-foreground/90 hover:text-primary">Airdrop hub</Link></li>
            <li><Link to="/aetherion" className="text-foreground/90 hover:text-primary">Meet Aetherion</Link></li>
            <li><Link to="/bridge?mode=faucet-lab" className="text-foreground/90 hover:text-primary">SphinxOS Faucet lab</Link></li>
            <li><Link to="/lp" className="text-foreground/90 hover:text-primary">Daily sealed reading</Link></li>
          </ul>
          <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">Featured guides</p>
          <ul className="mt-1.5 space-y-1 text-[11px]">
            {featuredLearn.map((t) => (
              <li key={t.slug}>
                <Link to={`/learn/${t.slug}`} className="text-muted-foreground hover:text-foreground underline underline-offset-2 decoration-border line-clamp-1">
                  {t.topic}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="border-t border-border/40">
        <div className="max-w-6xl mx-auto px-5 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70">
          <span>© {YEAR} {SITE} · Excalibur Crypto · Sealed on-chain</span>
          <PoweredByUI3 className="normal-case tracking-[0.22em]" />
          <span className="italic normal-case tracking-normal">The rite is the receipt.</span>
        </div>
      </div>
    </footer>
  );
}
