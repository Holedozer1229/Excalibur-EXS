import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import WrapConsole from "@/components/WrapConsole";
import { AETHERION } from "@/lib/brand";
import { SITE_ORIGIN, siteUrl } from "@/lib/site";
import { L1_WETH } from "@/lib/eipUruuBridgeClaim";
import { URUU_WRAP_STATUS } from "@/lib/uruu";
import { WETH_WRAP_STATUS } from "@/lib/wrapLive";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "WETH wrap — live",
    url: siteUrl("/wrap"),
    description: `Canonical L1 WETH wrap is live at ${L1_WETH}. URUU→wURUU custody wrap is ${URUU_WRAP_STATUS}.`,
  },
];

export default function WrapLive() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`WETH wrap live — ${AETHERION}`}
        description={`ETH→WETH on mainnet is live. URUU wrap into wURUU is ${URUU_WRAP_STATUS}. Does not mint 137 ETH.`}
        path="/wrap"
        ogType="article"
        jsonLd={jsonLd}
      />
      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20" data-testid="wrap-page">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Wrap</span>
        </nav>
        <header className="mb-8">
          <h1 className="mb-3 font-display text-4xl uppercase tracking-widest gradient-neon-text">
            Wrap · {WETH_WRAP_STATUS}
          </h1>
          <p className="text-muted-foreground">
            Necessary wrap components that already exist on mainnet: WETH {L1_WETH} and the zkSync
            L1 mailbox. This page wires them to your wallet. URUU → wURUU remains {URUU_WRAP_STATUS}{" "}
            — no lock contract, no 1:1 Solana mint. Hosted on {SITE_ORIGIN.replace("https://", "")}.
          </p>
        </header>
        <WrapConsole />
      </main>
      <SiteFooter />
    </div>
  );
}
