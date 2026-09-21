import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import MindOfTheCosmosDeck from "@/components/cosmos/MindOfTheCosmosDeck";
import { MIND_OF_THE_COSMOS, MIND_PATH, cosmosCopy } from "@/lib/mindOfTheCosmos";
import { siteUrl } from "@/lib/site";

export default function MindOfTheCosmos() {
  const copy = cosmosCopy();
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`${MIND_OF_THE_COSMOS} — 24/7 liquidity compound`}
        description={copy.tagline}
        path={MIND_PATH}
        ogType="website"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${MIND_OF_THE_COSMOS} · Excalibur Crypto`,
            url: siteUrl(MIND_PATH),
          },
        ]}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="mind-of-the-cosmos-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Port
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">{MIND_OF_THE_COSMOS}</span>
        </nav>
        <MindOfTheCosmosDeck />
      </main>
      <SiteFooter />
    </div>
  );
}
