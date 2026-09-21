// AetxDeployStatus — verifies the AETX BRC-20 deploy inscription on Bitcoin
// mainnet via the public Hiro Ordinals API and renders live confirmation
// details + a supply progress bar. No backend, no auth.
import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Loader2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Canonical AETX deploy inscription (BRC-20 on Bitcoin L1).
export const AETX_INSCRIPTION_ID =
  "81231a6098679a4b8183c6d4695b46666772ee7b09d30b6b1636f8e78be89dfbi0";

type InscriptionMeta = {
  id: string;
  number: number;
  genesis_block_height: number;
  genesis_timestamp: number;
  genesis_tx_id: string;
  address: string;
  content_type: string;
};

type BrcTokenMeta = {
  ticker: string;
  max_supply: string;
  mint_limit: string;
  decimals: number;
  minted_supply: string;
  tx_count: number;
  deploy_timestamp: number;
};

type Status = "loading" | "ok" | "error";

const HIRO = "https://api.hiro.so/ordinals/v1";

function fmt(n: string | number) {
  const num = typeof n === "string" ? Number(n) : n;
  if (!isFinite(num)) return String(n);
  return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

export default function AetxDeployStatus({ compact = false }: { compact?: boolean }) {
  const [status, setStatus] = useState<Status>("loading");
  const [meta, setMeta] = useState<InscriptionMeta | null>(null);
  const [token, setToken] = useState<BrcTokenMeta | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [insR, tokR] = await Promise.all([
          fetch(`${HIRO}/inscriptions/${AETX_INSCRIPTION_ID}`),
          fetch(`${HIRO}/brc-20/tokens/AETX`),
        ]);
        if (!insR.ok) throw new Error(`inscription ${insR.status}`);
        const insJ = (await insR.json()) as InscriptionMeta;
        const tokJ = tokR.ok ? ((await tokR.json()) as { token?: BrcTokenMeta } | BrcTokenMeta) : null;
        if (cancelled) return;
        setMeta(insJ);
        // Hiro sometimes wraps in { token: {...} }.
        const t = tokJ && "token" in (tokJ as object) ? (tokJ as { token: BrcTokenMeta }).token : (tokJ as BrcTokenMeta | null);
        setToken(t ?? null);
        setStatus("ok");
      } catch (e) {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : "verification failed");
        setStatus("error");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const shortId = `${AETX_INSCRIPTION_ID.slice(0, 8)}…${AETX_INSCRIPTION_ID.slice(-6)}`;
  const unisatPreview = `https://static.unisat.space/preview/${AETX_INSCRIPTION_ID}`;
  const ordinalsUrl = `https://ordinals.com/inscription/${AETX_INSCRIPTION_ID}`;
  const mempoolTx = meta ? `https://mempool.space/tx/${meta.genesis_tx_id}` : null;

  const mintedPct = token
    ? Math.min(100, (Number(token.minted_supply) / Number(token.max_supply)) * 100)
    : 0;

  return (
    <section
      aria-labelledby="aetx-deploy-status"
      className="border-rune rounded-sm bg-card/40 backdrop-blur-sm p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {status === "ok" && <CheckCircle2 className="h-4 w-4 text-primary" />}
          {status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
          <h2 id="aetx-deploy-status" className="text-sm font-display tracking-widest uppercase">
            AETX On-Chain Deploy
          </h2>
        </div>
        <Badge variant={status === "ok" ? "default" : status === "error" ? "destructive" : "secondary"}>
          {status === "loading" ? "verifying…" : status === "ok" ? "verified" : "unreachable"}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-mono">
        <dt className="text-muted-foreground">Ticker</dt>
        <dd>AETX</dd>

        <dt className="text-muted-foreground">Protocol</dt>
        <dd>BRC-20 · Bitcoin L1</dd>

        <dt className="text-muted-foreground">Inscription</dt>
        <dd className="truncate">
          <a href={ordinalsUrl} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
            {shortId} <ExternalLink className="h-3 w-3" />
          </a>
        </dd>

        {meta && (
          <>
            <dt className="text-muted-foreground">Number</dt>
            <dd>#{meta.number.toLocaleString()}</dd>

            <dt className="text-muted-foreground">Block</dt>
            <dd>{meta.genesis_block_height.toLocaleString()}</dd>

            <dt className="text-muted-foreground">Confirmed</dt>
            <dd>{new Date(meta.genesis_timestamp).toISOString().slice(0, 10)}</dd>

            <dt className="text-muted-foreground">Deploy tx</dt>
            <dd className="truncate">
              <a href={mempoolTx!} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
                {meta.genesis_tx_id.slice(0, 10)}… <ExternalLink className="h-3 w-3" />
              </a>
            </dd>
          </>
        )}

        {token && (
          <>
            <dt className="text-muted-foreground">Max supply</dt>
            <dd>{fmt(token.max_supply)}</dd>

            <dt className="text-muted-foreground">Mint limit</dt>
            <dd>{fmt(token.mint_limit)}</dd>

            <dt className="text-muted-foreground">Decimals</dt>
            <dd>{token.decimals}</dd>

            <dt className="text-muted-foreground">Minted</dt>
            <dd>{fmt(token.minted_supply)} ({mintedPct.toFixed(2)}%)</dd>
          </>
        )}
      </dl>

      {token && (
        <div className="space-y-1">
          <Progress value={mintedPct} />
          <p className="text-[10px] text-muted-foreground font-mono">
            {fmt(token.minted_supply)} / {fmt(token.max_supply)} AETX minted · {token.tx_count.toLocaleString()} inscriptions
          </p>
        </div>
      )}

      {!compact && (
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <a href={unisatPreview} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> UniSat preview
          </a>
          <a href={ordinalsUrl} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> ordinals.com
          </a>
          <a href={`https://unisat.io/brc20/AETX`} target="_blank" rel="noopener" className="text-primary hover:underline inline-flex items-center gap-1">
            <ExternalLink className="h-3 w-3" /> UniSat market
          </a>
        </div>
      )}

      {status === "error" && (
        <p className="text-[11px] text-destructive/80 font-mono">
          Live verification unavailable ({err}). The inscription is still viewable on-chain via the links above.
        </p>
      )}
    </section>
  );
}
