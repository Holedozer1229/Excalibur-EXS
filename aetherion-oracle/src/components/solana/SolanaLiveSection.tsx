import { lazy, Suspense } from "react";
import PoweredByUI3 from "@/components/PoweredByUI3";
import type { ClusterName } from "@/lib/solana/fairLatticeProgram";

const SolanaShell = lazy(() => import("@/components/solana/SolanaShell"));
const SolanaDeployCard = lazy(() => import("@/components/solana/SolanaDeployCard"));
const SolanaLatticePanel = lazy(() => import("@/components/solana/SolanaLatticePanel"));

type Props = {
  cluster?: ClusterName;
  className?: string;
};

export default function SolanaLiveSection({ cluster = "devnet", className = "" }: Props) {
  return (
    <section className={className} data-testid="solana-live-section">
      <PoweredByUI3 className="mb-4 text-center text-accent/90" />
      <Suspense
        fallback={
          <p className="mb-10 text-sm text-muted-foreground">Loading Solana wallet…</p>
        }
      >
        <SolanaShell cluster={cluster}>
          <SolanaDeployCard cluster={cluster} className="mb-6" />
          <SolanaLatticePanel />
        </SolanaShell>
      </Suspense>
    </section>
  );
}
