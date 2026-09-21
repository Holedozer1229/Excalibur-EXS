// /black-pearl — pirate command deck on the Excalibur lattice
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import BlackPearlDeck from "@/components/pirate/BlackPearlDeck";
import { BLACK_PEARL, CREW_MOTTO } from "@/lib/blackPearl";
import { siteUrl } from "@/lib/site";

export default function BlackPearl() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`${BLACK_PEARL} — Arrr, Plunder the Lattice`}
        description={`${CREW_MOTTO}. Founder treasure, zkEVM seas, crew bounty — aboard ${BLACK_PEARL} at Excalibur Crypto.`}
        path="/black-pearl"
        ogType="website"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${BLACK_PEARL} · Excalibur Crypto`,
            url: siteUrl("/black-pearl"),
          },
        ]}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="black-pearl-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Port
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{BLACK_PEARL}</span>
        </nav>

        <BlackPearlDeck />
      </main>
      <SiteFooter />
    </div>
  );
}
