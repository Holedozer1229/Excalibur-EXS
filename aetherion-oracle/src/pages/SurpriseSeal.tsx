import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import { AETHERION } from "@/lib/brand";
import { siteUrl } from "@/lib/site";
import {
  GENESIS_UNSPENDABLE_NOTE,
  buildSurpriseSeal,
  fetchGenesisTribute,
  type GenesisTribute,
} from "@/lib/surpriseSeal";

export default function SurpriseSealPage() {
  const seal = buildSurpriseSeal("surprise me");
  const [tribute, setTribute] = useState<GenesisTribute | null>(null);
  useEffect(() => {
    let alive = true;
    fetchGenesisTribute().then((t) => {
      if (alive) setTribute(t);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`Surprise — 50 is the echo · ${AETHERION}`}
        description={seal.rhyme.note}
        path="/surprise"
        ogType="article"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Surprise seal",
            url: siteUrl("/surprise"),
            description: seal.rhyme.note,
          },
        ]}
      />
      <main
        className="relative z-10 mx-auto max-w-2xl px-5 py-12 md:py-20"
        data-testid="surprise-page"
      >
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Surprise</span>
        </nav>

        <div className="overflow-hidden rounded-lg border border-amber-200/30 bg-[#f4ecd8] text-[#1a1408] shadow-[0_0_80px_-20px_rgba(251,191,36,0.55)]">
          <header className="border-b border-[#1a1408]/20 px-5 py-4 text-center">
            <p className="font-serif text-[10px] uppercase tracking-[0.35em]">The Times · lattice reprint</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight md:text-4xl">{seal.guests.times}</h1>
            <p className="mt-3 font-serif text-sm italic">A second headline, not a second bailout.</p>
          </header>
          <div className="space-y-4 px-5 py-6 font-serif text-sm leading-relaxed">
            <p className="text-lg" data-testid="surprise-rhyme">
              {seal.rhyme.note}
            </p>
            <p>
              Card drawn for the knot: <strong>{seal.card}</strong>. Caduceus{" "}
              {seal.caduceus.state} · {seal.caduceus.hexagram}.
            </p>
            <dl className="space-y-1 font-mono text-[11px] text-[#1a1408]/80">
              <div>Satoshi · {seal.guests.satoshi}</div>
              <div className="break-all">txid · {seal.guests.txid}</div>
              <div className="break-all" data-testid="surprise-juice">
                juice · {seal.guests.juicePublic}
              </div>
              <div className="break-all">WETH {seal.guests.wethStatus} · {seal.guests.weth}</div>
              <div className="break-all">SKYNT costume · {seal.guests.skyntEvm}</div>
              <div>
                subsidy rhyme · {seal.rhyme.btcGenesisSubsidy} BTC genesis · {seal.rhyme.tetraReward}{" "}
                EXCAL block
              </div>
            </dl>
            <p className="break-all font-mono text-[11px]">
              seal · {seal.seal}
            </p>
            <p data-testid="surprise-unspendable">{GENESIS_UNSPENDABLE_NOTE}</p>
            {tribute && (
              <p className="font-mono text-[11px] text-[#1a1408]/80" data-testid="surprise-tribute">
                live tribute · {tribute.receivedBtc.toFixed(2)} BTC received in {tribute.deposits.toLocaleString()}{" "}
                deposits · outputs ever spent: {tribute.spentOutputs}
              </p>
            )}
            <p className="text-xs">{seal.honesty.note}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link to="/#aetherion-terminal" className="underline underline-offset-4">
            Type surprise me
          </Link>
          <Link to="/wrap" className="underline underline-offset-4">
            WETH wrap
          </Link>
          <Link to="/exs" className="underline underline-offset-4">
            Tetra-PoW
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
