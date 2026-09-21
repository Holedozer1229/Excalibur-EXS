import { useCallback, useEffect, useRef, useState } from "react";
import { PageHead } from "@/components/PageHead";
import UruuLayout, { UruuCard } from "@/components/uruu/UruuLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_RPC_URL,
  RPC_STORAGE_KEY,
  type ChainStatus,
  type RpcBlock,
  fetchBlocks,
  fetchStatus,
  formatGwei,
  hexToBig,
  relativeTime,
  truncateHex,
} from "@/lib/uruu/rpc";
import { bin6, sealFromHash, uruuTrajectory, MASK6 } from "@/lib/uruu/step";

const REFRESH_OPTIONS = [0, 2000, 5000, 10000];

function Waveform({ points }: { points: number[] }) {
  const w = 320;
  const h = 70;
  const dx = w / Math.max(1, points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${(i * dx).toFixed(1)},${(h - (p / MASK6) * h).toFixed(1)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20" role="img" aria-label="URUU step trajectory">
      <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" />
    </svg>
  );
}

export default function UruuExplorer() {
  const [rpcUrl, setRpcUrl] = useState(
    () => localStorage.getItem(RPC_STORAGE_KEY) || DEFAULT_RPC_URL,
  );
  const [activeUrl, setActiveUrl] = useState(rpcUrl);
  const [status, setStatus] = useState<ChainStatus | null>(null);
  const [blocks, setBlocks] = useState<RpcBlock[]>([]);
  const [selected, setSelected] = useState<RpcBlock | null>(null);
  const [interval, setIntervalMs] = useState(5000);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    supabase
      .from("rpc_endpoints")
      .select("url")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.url && !localStorage.getItem(RPC_STORAGE_KEY)) {
          setRpcUrl(data.url);
          setActiveUrl(data.url);
        }
      });
  }, []);

  const load = useCallback(async (url: string) => {
    setLoading(true);
    try {
      const s = await fetchStatus(url);
      setStatus(s);
      setBlocks(await fetchBlocks(url, s.height, 25));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "RPC request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(activeUrl);
  }, [activeUrl, load]);

  useEffect(() => {
    if (timer.current) window.clearInterval(timer.current);
    if (interval > 0) {
      timer.current = window.setInterval(() => load(activeUrl), interval);
    }
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [interval, activeUrl, load]);

  const connect = () => {
    localStorage.setItem(RPC_STORAGE_KEY, rpcUrl);
    setActiveUrl(rpcUrl);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(blocks, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `uruu-blocks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const seal = selected ? sealFromHash(selected.hash) : 0;

  return (
    <UruuLayout>
      <PageHead
        title="URUU Block Explorer — Live EVM JSON-RPC Chain Viewer"
        description="Point the URUU explorer at any EVM JSON-RPC endpoint: live block height, gas price, chain ID, the latest 25 blocks, and the 6-bit URUU seal for each block."
        path="/uruu/explorer"
      />

      <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
        <UruuCard className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              value={rpcUrl}
              onChange={(e) => setRpcUrl(e.target.value)}
              placeholder="https://…"
              aria-label="JSON-RPC endpoint URL"
              className="flex-1 min-w-[240px] font-mono text-xs"
            />
            <Button onClick={connect} className="tracking-[0.2em]">CONNECT</Button>
            <Button variant="outline" onClick={exportJson} className="tracking-[0.2em]">EXPORT</Button>
            <select
              aria-label="Auto refresh"
              value={interval}
              onChange={(e) => setIntervalMs(Number(e.target.value))}
              className="h-10 border border-border bg-input px-3 text-xs rounded-sm"
            >
              {REFRESH_OPTIONS.map((ms) => (
                <option key={ms} value={ms}>{ms === 0 ? "OFF" : `${ms / 1000}s`}</option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap gap-6 text-xs">
            <span className="text-muted-foreground">
              HEIGHT <span className="text-primary tabular-nums">{status ? status.height.toString() : "—"}</span>
            </span>
            <span className="text-muted-foreground">
              GAS <span className="text-primary">{status ? formatGwei(status.gasPrice) : "—"}</span>
            </span>
            <span className="text-muted-foreground">
              CHAIN ID <span className="text-primary">{status ? `0x${status.chainId.toString(16)} (${status.chainId.toString()})` : "—"}</span>
            </span>
            {loading && <span className="text-accent-foreground">SYNCING…</span>}
          </div>
        </UruuCard>

        <UruuCard className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left tracking-[0.2em]">HEIGHT</th>
                <th className="px-4 py-3 text-left tracking-[0.2em]">AGE</th>
                <th className="px-4 py-3 text-right tracking-[0.2em]">TXS</th>
                <th className="px-4 py-3 text-right tracking-[0.2em]">GAS</th>
                <th className="px-4 py-3 text-left tracking-[0.2em]">PROPOSER</th>
                <th className="px-4 py-3 text-left tracking-[0.2em]">HASH</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {blocks.map((b) => (
                <tr
                  key={b.hash}
                  onClick={() => setSelected(b)}
                  className="cursor-pointer hover:bg-secondary/60"
                >
                  <td className="px-4 py-3 tabular-nums text-primary">{hexToBig(b.number).toString()}</td>
                  <td className="px-4 py-3">{relativeTime(hexToBig(b.timestamp))}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{b.transactions?.length ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {hexToBig(b.gasUsed).toString()} / {hexToBig(b.gasLimit).toString()}
                  </td>
                  <td className="px-4 py-3">{b.miner ? truncateHex(b.miner, 8, 6) : "—"}</td>
                  <td className="px-4 py-3">{truncateHex(b.hash)}</td>
                </tr>
              ))}
              {!blocks.length && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No blocks loaded.</td></tr>
              )}
            </tbody>
          </table>
        </UruuCard>
      </div>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="uruu-scope w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="text-primary tracking-[0.25em] text-sm">
              BLOCK {selected ? hexToBig(selected.number).toString() : ""}
            </SheetTitle>
          </SheetHeader>
          {selected && (
            <div className="mt-6 space-y-6 text-xs">
              <dl className="divide-y divide-border">
                {Object.entries(selected)
                  .filter(([k]) => k !== "transactions")
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="break-all text-right">{String(v)}</dd>
                    </div>
                  ))}
                <div className="flex justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">timestamp (abs)</dt>
                  <dd>{new Date(Number(hexToBig(selected.timestamp)) * 1000).toISOString()}</dd>
                </div>
              </dl>

              <div>
                <h3 className="text-primary tracking-[0.3em] mb-2">URUU SEAL · 0x101</h3>
                <p className="tabular-nums">
                  seal = {seal} · 0b{bin6(seal)}
                </p>
              </div>

              <div>
                <h3 className="text-primary tracking-[0.3em] mb-2">STEP TRAJECTORY · 47 ROUNDS</h3>
                <Waveform points={uruuTrajectory(seal, 47)} />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </UruuLayout>
  );
}
