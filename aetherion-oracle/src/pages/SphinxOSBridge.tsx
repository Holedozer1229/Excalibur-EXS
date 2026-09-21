// /bridge — SphinxOS × Aetherion zkEVM ↔ Solana bridge console
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import DevnetRollupStrip from "@/components/DevnetRollupStrip";
import GalacticBackground from "@/components/GalacticBackground";
import SiteFooter from "@/components/SiteFooter";
import SphinxOSBridgePanel from "@/components/SphinxOSBridgePanel";
import { AETHERION_X_SPHINX, SPHINX_OS } from "@/lib/brand";

const SITE = "https://www.excaliburcrypto.com";

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: "SphinxOS Bridge", item: `${SITE}/bridge` },
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: `${SPHINX_OS} Bridge`,
    url: `${SITE}/bridge`,
    applicationCategory: "FinanceApplication",
    description:
      "Aetherion SphinxOS faucet lab: MetaMask/Rainbow on zkSync Sepolia + Polygon zkEVM Cardona, Solana Devnet faucets, and URUU↔wURUU bridge checklist.",
  },
];

export default function SphinxOSBridge() {
  return (
    <div className="relative min-h-screen text-foreground">
      <DevnetRollupStrip />
      <GalacticBackground />
      <PageHead
        title={`${SPHINX_OS} Bridge — Faucet lab · ${AETHERION_X_SPHINX}`}
        description={`${SPHINX_OS} Bridge — mainnet zkSync Era / Polygon zkEVM + Faucet lab. MetaMask/Rainbow, URUU↔wURUU checklist.`}
        path="/bridge"
        ogType="website"
        jsonLd={jsonLd}
      />

      <main className="relative z-10 mx-auto max-w-3xl px-5 py-12 md:py-20">
        <nav className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            Aetherion
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground">SphinxOS zkEVM Bridge</span>
        </nav>

        <p className="mb-6 rounded-md border border-amber-700/30 bg-amber-950/20 px-4 py-3 text-sm text-muted-foreground">
          Need L1 <strong>SphinxBootyBridge</strong> for{" "}
          <code className="text-xs">claimStarkProof</code>?{" "}
          <Link to="/bridge/booty" className="font-medium text-amber-200 underline underline-offset-2">
            Deploy via connected wallet →
          </Link>
        </p>
        <SphinxOSBridgePanel />
      </main>
      <SiteFooter />
    </div>
  );
}
