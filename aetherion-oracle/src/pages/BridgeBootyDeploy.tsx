// /bridge/booty — wallet-connected SphinxBootyBridge deploy on Ethereum L1
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import BootyBridgeDeployPanel from "@/components/bridge/BootyBridgeDeployPanel";
import { AETHERION, SPHINX_OS } from "@/lib/brand";

const SITE = "https://www.excaliburcrypto.com";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "Bridge", item: `${SITE}/bridge` },
      {
        "@type": "ListItem",
        position: 3,
        name: "Booty Bridge Deploy",
        item: `${SITE}/bridge/booty`,
      },
    ],
  },
];

export default function BridgeBootyDeployPage() {
  return (
    <div className="relative min-h-screen text-foreground">
      <GalacticBackground />
      <PageHead
        title={`SphinxBootyBridge Deploy — ${SPHINX_OS} · ${AETHERION}`}
        description="Wallet-connected auto-deploy for SphinxBootyBridge on Ethereum mainnet. Preflight chainId=1, balance, and bytecode — user pays gas. Links to zk claimStarkProof pipeline."
        path="/bridge/booty"
        ogType="website"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/bridge" className="hover:text-foreground">
            Bridge
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">Booty deploy</span>
        </nav>

        <BootyBridgeDeployPanel autoDeploy />
      </main>
      <SiteFooter />
    </div>
  );
}
