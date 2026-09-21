import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Cpu } from "lucide-react";
import {
  FAIR_LATTICE_PROGRAM_ID,
  deploymentFor,
  latticePda,
  type ClusterName,
} from "@/lib/solana/fairLatticeProgram";
import { hostedProgramUrls } from "@/lib/solana/hostedProgram";
import { Connection } from "@solana/web3.js";
import PoweredByUI3 from "@/components/PoweredByUI3";

type Props = {
  cluster?: ClusterName;
  className?: string;
};

export default function SolanaDeployCard({ cluster = "devnet", className = "" }: Props) {
  const [live, setLive] = useState<boolean | null>(null);
  const [mint, setMint] = useState<string | null>(null);
  const dep = deploymentFor(cluster);
  const [lattice] = latticePda();

  useEffect(() => {
    (async () => {
      try {
        const conn = new Connection(dep.rpc, "confirmed");
        const info = await conn.getAccountInfo(FAIR_LATTICE_PROGRAM_ID);
        setLive(info != null && info.executable);
        const state = await conn.getAccountInfo(lattice);
        if (state?.data && state.data.length > 72) {
          const mintPk = state.data.slice(40, 72);
          const hex = Buffer.from(mintPk).toString("hex");
          if (hex !== "0".repeat(64)) {
            setMint(
              `${hex.slice(0, 8)}…${hex.slice(-8)}`,
            );
          }
        }
      } catch {
        setLive(false);
      }
    })();
  }, [dep.rpc, lattice]);

  const explorer =
    cluster === "devnet"
      ? `https://explorer.solana.com/address/${FAIR_LATTICE_PROGRAM_ID.toBase58()}?cluster=devnet`
      : `https://explorer.solana.com/address/${FAIR_LATTICE_PROGRAM_ID.toBase58()}?cluster=custom&customUrl=${encodeURIComponent(dep.rpc)}`;

  return (
    <Card className={`border-accent/40 bg-accent/5 ${className}`} data-testid="solana-deploy-card">
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-display text-lg uppercase tracking-widest text-accent">
            <Cpu className="h-4 w-4" />
            Solana program
          </h2>
          <Badge variant="outline" className="text-[10px] uppercase">
            {cluster} · {live === null ? "checking…" : live ? "deployed" : "not found"}
          </Badge>
        </div>
        <dl className="space-y-1 font-mono text-xs">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Program</dt>
            <dd className="truncate text-right">{FAIR_LATTICE_PROGRAM_ID.toBase58()}</dd>
          </div>
          {mint && (
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">wURUU mint</dt>
              <dd className="truncate text-right">{mint}</dd>
            </div>
          )}
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Fee cap</dt>
            <dd>1% each way · on-chain</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Attributes</dt>
            <dd>Referral PDAs on swap</dd>
          </div>
        </dl>
        <a
          href={explorer}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Explorer <ExternalLink className="h-3 w-3" />
        </a>
        <p className="text-[11px] text-muted-foreground">
          Power curve P(s)=P₀(1+s/S)ⁿ, two-way buy/sell, on-chain referral attributes.
          Deploy: <code className="text-[10px]">CLUSTER={cluster} ./scripts/deploy-solana.sh</code>
        </p>
        <p className="text-[10px] text-muted-foreground">
          Hosted on this React server:{" "}
          <a href={hostedProgramUrls().idl} className="text-primary hover:underline">
            IDL
          </a>
          {" · "}
          <a href={hostedProgramUrls().manifest} className="text-primary hover:underline">
            manifest
          </a>
        </p>
        <PoweredByUI3 className="text-center" />
      </CardContent>
    </Card>
  );
}
