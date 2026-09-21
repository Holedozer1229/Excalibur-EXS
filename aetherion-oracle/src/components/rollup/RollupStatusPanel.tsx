/**
 * Mainnet zkEVM rollup status — zkSync Era, Polygon zkEVM, Solana, B2B legs.
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleDashed, ExternalLink, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { buildZkevmRollupManifest, ZKEVM_BRIDGE_PATH, type RollupLegStatus } from "@/lib/zkevmRollup";

type Props = {
  solanaStatus?: RollupLegStatus;
  className?: string;
};

export default function RollupStatusPanel({ solanaStatus = "pending", className = "" }: Props) {
  const manifest = useMemo(
    () => buildZkevmRollupManifest(undefined, solanaStatus),
    [solanaStatus],
  );

  const legs = [
    {
      id: "zksync",
      label: "zkSync Era",
      detail: `Chain ${manifest.zkevm.zkSyncEra.chainId} · URUU live`,
      status: manifest.zkevm.zkSyncEra.status,
      href: ZKEVM_BRIDGE_PATH,
    },
    {
      id: "polygon",
      label: "Polygon zkEVM",
      detail: `Chain ${manifest.zkevm.polygonZkEvm.chainId} · SphinxOS attestation`,
      status: manifest.zkevm.polygonZkEvm.status,
      href: ZKEVM_BRIDGE_PATH,
    },
    {
      id: "solana",
      label: "Solana fair_lattice",
      detail: `${manifest.solana.cluster} · ${manifest.solana.programId.slice(0, 8)}…`,
      status: manifest.solana.status,
      href: "/token/lattice",
    },
    {
      id: "b2b",
      label: "Proof-of-Deliberation",
      detail: "B2B seal + public verify",
      status: manifest.b2b.status,
      href: manifest.b2b.deliberationPath,
    },
  ];

  return (
    <Card
      className={`border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-fuchsia-950/10 ${className}`}
      data-testid="rollup-status-panel"
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 gap-1 bg-violet-900/50 text-violet-100 border-violet-600/40">
              <Layers className="h-3 w-3" />
              Mainnet zkEVM rollup
            </Badge>
            <h2 className="font-display text-lg uppercase tracking-widest text-violet-100">
              SphinxOS lattice status
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {manifest.bootyEth} ETH booty · {manifest.solanaSolBudget.toLocaleString()} SOL budget ·{" "}
              <a
                href="/rollup/manifest.json"
                className="text-violet-300 hover:text-violet-200"
                target="_blank"
                rel="noopener noreferrer"
              >
                manifest
              </a>
            </p>
          </div>
          <Badge variant="outline" className="font-mono text-[10px]">
            v{manifest.version}
          </Badge>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {legs.map((leg) => (
            <li
              key={leg.id}
              className="flex items-center justify-between gap-2 rounded border border-violet-900/30 bg-black/25 px-3 py-2"
              data-testid={`rollup-leg-${leg.id}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-violet-100">{leg.label}</p>
                <p className="truncate text-[10px] text-muted-foreground">{leg.detail}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusIcon status={leg.status} />
                <Link to={leg.href} className="text-violet-400 hover:text-violet-300">
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function StatusIcon({ status }: { status: RollupLegStatus }) {
  if (status === "live") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-label="live" />;
  }
  return <CircleDashed className="h-4 w-4 text-amber-400" aria-label={status} />;
}
