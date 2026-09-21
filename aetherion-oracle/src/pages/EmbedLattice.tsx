// /embed/lattice — iframe-friendly bonding curve widget for third-party sites.
import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { PageHead } from "@/components/PageHead";
import BondingCurvePanel from "@/components/BondingCurvePanel";
import { useUtm } from "@/hooks/useUtm";
import { captureReferralFromSearch } from "@/lib/curveShare";
import { useEffect } from "react";

export default function EmbedLattice() {
  useUtm("curve_embed_view");

  useEffect(() => {
    captureReferralFromSearch(window.location.search);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground" data-testid="embed-lattice">
      <PageHead
        title="URUU Bonding Curve Widget"
        description="Embeddable two-way URUU bonding curve calculator. 1% max fee. Calculator only — not a live pool."
        path="/embed/lattice"
        noIndex
      />
      <main className="mx-auto max-w-md px-3 py-4">
        <BondingCurvePanel compact />
        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Calculator only · not a live market ·{" "}
          <Link to="/token/lattice" className="inline-flex items-center gap-0.5 text-primary hover:underline">
            Full lattice <ExternalLink className="h-2.5 w-2.5" />
          </Link>
          {" · "}
          <Link to="/buy/uruu" className="text-primary hover:underline">
            Buy URUU
          </Link>
        </p>
      </main>
    </div>
  );
}
