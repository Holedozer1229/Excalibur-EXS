import { useEffect, useState } from "react";
import { ExternalLink, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  URUU_ADDRESS,
  URUU_BLOCKSCOUT_API,
  URUU_CHAIN,
  URUU_CURVE_STATUS,
  URUU_EXPLORER,
  URUU_FALLBACK_META,
  URUU_STANDARD,
  URUU_STATUS,
  URUU_TICK,
  URUU_WRAP_STATUS,
  parseUruuTokenMeta,
  uruuShort,
  type UruuTokenMeta,
} from "@/lib/uruu";

type Status = "loading" | "live" | "cached";

export default function UruuContractCard({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("loading");
  const [meta, setMeta] = useState<UruuTokenMeta | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(URUU_BLOCKSCOUT_API);
        if (!res.ok) throw new Error(`blockscout ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setMeta(parseUruuTokenMeta(json));
        setStatus("live");
      } catch {
        if (cancelled) return;
        setMeta(URUU_FALLBACK_META);
        setStatus("cached");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const display = meta ?? URUU_FALLBACK_META;

  return (
    <section
      aria-labelledby="uruu-contract"
      className="rounded-md border border-primary/40 bg-primary/5 p-4"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === "live" && <CheckCircle2 className="h-4 w-4 text-primary" />}
          {status === "cached" && <XCircle className="h-4 w-4 text-muted-foreground" />}
          <h2 id="uruu-contract" className="font-display text-sm uppercase tracking-widest">
            {display.name}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
            Token {URUU_STATUS}
          </Badge>
          {status === "live" && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              Blockscout live
            </Badge>
          )}
          {status === "cached" && (
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              Cached on-chain
            </Badge>
          )}
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs">
        <dt className="text-muted-foreground">Standard</dt>
        <dd>{URUU_STANDARD}</dd>
        <dt className="text-muted-foreground">Symbol</dt>
        <dd>{display.symbol}</dd>
        <dt className="text-muted-foreground">Contract</dt>
        <dd className="truncate">
          <a
            href={URUU_EXPLORER}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            {uruuShort} <ExternalLink className="h-3 w-3" />
          </a>
        </dd>
        {status !== "loading" && (
          <>
            <dt className="text-muted-foreground">Total supply</dt>
            <dd>{display.totalSupply}</dd>
            <dt className="text-muted-foreground">Holders</dt>
            <dd>{display.holdersCount.toLocaleString()}</dd>
          </>
        )}
        <dt className="text-muted-foreground">Wrap</dt>
        <dd>{URUU_WRAP_STATUS}</dd>
        <dt className="text-muted-foreground">Curve</dt>
        <dd>{URUU_CURVE_STATUS}</dd>
      </dl>
      {!compact && (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          {status === "live"
            ? "Verified on zkSync Blockscout. "
            : status === "cached"
              ? "Blockscout unreachable — showing last-known on-chain values. "
              : "Verifying on zkSync Blockscout… "}
          The token contract is live. The{" "}
          <Link to="/token/lattice" className="text-primary hover:underline">
            custom bonding curve
          </Link>{" "}
          is a calculator with a 1% fee cap — it does not hold or move{" "}
          {URUU_TICK}. Do not send funds to any wrap or pool address shown as a demo.
          Full address: <span className="break-all font-mono">{URUU_ADDRESS}</span>
        </p>
      )}
    </section>
  );
}
