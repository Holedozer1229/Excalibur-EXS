import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  appendMinedBlock,
  adoptLongerChain,
  fetchTetraPeer,
  gossipTetraChain,
  loadTetraChain,
  persistTetraChain,
  tetraViewFromChain,
  TETRA_POW_CHANNEL,
} from "@/lib/tetraPowNet";
import {
  draftNextBlock,
  mineBlock,
  TETRA_BLOCK_REWARD,
  TETRA_TICK,
  type TetraBlock,
} from "@/lib/tetraPow";

type Props = {
  compact?: boolean;
};

export default function TetraPowMiner({ compact = false }: Props) {
  const [chain, setChain] = useState<TetraBlock[]>(() => loadTetraChain());
  const [mining, setMining] = useState(false);
  const [hashes, setHashes] = useState(0);
  const miningRef = useRef(false);

  const view = useMemo(() => tetraViewFromChain(chain), [chain]);

  useEffect(() => {
    persistTetraChain(chain);
  }, [chain]);

  useEffect(() => {
    let cancelled = false;
    void fetchTetraPeer().then((peer) => {
      if (cancelled || !peer) return;
      setChain((local) => adoptLongerChain(local, peer));
    });
    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(TETRA_POW_CHANNEL);
      channel.onmessage = (event: MessageEvent<{ kind?: string; chain?: TetraBlock[] }>) => {
        if (event.data?.kind !== "tetra-chain" || !event.data.chain) return;
        setChain((local) => adoptLongerChain(local, event.data.chain!));
      };
    }
    return () => {
      cancelled = true;
      channel?.close();
    };
  }, []);

  const adopt = useCallback((next: TetraBlock[]) => {
    setChain(next);
    void gossipTetraChain(next);
  }, []);

  const mineOne = useCallback(() => {
    if (miningRef.current) return;
    miningRef.current = true;
    setMining(true);
    setHashes(0);
    const tip = chain[chain.length - 1];
    window.setTimeout(() => {
      const found = mineBlock(draftNextBlock(tip, "browser-cpu"), 0, 2_000_000, (nonce) => {
        setHashes(nonce);
      });
      adopt(appendMinedBlock(chain, found));
      setHashes(found.nonce);
      setMining(false);
      miningRef.current = false;
    }, 30);
  }, [adopt, chain]);

  return (
    <Card
      className={
        compact
          ? "border-amber-500/40 bg-card/70"
          : "border-amber-500/50 bg-gradient-to-br from-amber-950/20 via-background to-violet-950/20"
      }
      data-testid="tetra-pow-miner"
    >
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className={compact ? "text-base" : "text-2xl"}>
          Tetra-PoW · CPU-mine {TETRA_TICK}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Four-lane SHA-256 tetrahedron. Reward {TETRA_BLOCK_REWARD} {TETRA_TICK} / block. Ledger
          EXCAL on this origin — not Bitcoin, not 1-to-1 BTC, not the undeployed L1 ERC-20. Satoshi
          genesis is a guest quote. Never swept. This host cannot spend 1A1zP1….
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <p className="text-xs text-muted-foreground">Height / tip</p>
            <p className="font-mono">
              {view.height} · {view.tip.hash.slice(0, 16)}…
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <p className="text-xs text-muted-foreground">Supply</p>
            <p className="font-mono">
              {view.supply} {TETRA_TICK}
            </p>
          </div>
          <div className="rounded-md border border-border/60 bg-background/40 p-2">
            <p className="text-xs text-muted-foreground">P2P</p>
            <p>origin gossip · tab mesh</p>
          </div>
        </div>
        <div className="rounded-md border border-amber-500/30 bg-amber-950/20 p-3 font-mono text-xs">
          <p className="font-sans text-xs font-semibold text-amber-200">Satoshi surprise (attest)</p>
          <p className="break-all">{view.satoshi.address}</p>
          <p className="mt-1 break-all text-muted-foreground">{view.satoshi.txid}</p>
          <p className="mt-1 font-sans text-muted-foreground">{view.satoshi.times}</p>
          <p className="mt-1 font-sans text-amber-100">{view.satoshi.note}</p>
          <p className="mt-1 font-sans text-amber-100">{view.satoshi.notBtcPeg}</p>
        </div>
        {!compact && (
          <div className="rounded-md border border-border/50 bg-background/30 p-3">
            <p className="text-xs font-semibold text-muted-foreground">Quantum state nodes</p>
            <ul className="mt-1 space-y-1 font-mono text-[11px]">
              {view.nodes.slice(0, 5).map((node) => (
                <li key={node.id}>
                  {node.id} · {node.chain} · {node.anchor.slice(0, 22)}…
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={mineOne} disabled={mining} data-testid="tetra-mine-button">
            {mining ? `Mining… nonce ${hashes}` : `Mine ${TETRA_TICK} on CPU`}
          </Button>
          <Button asChild variant="outline">
            <Link to="/exs">Full Tetra-PoW page</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/#helm">Helm tetra</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{view.honesty.note}</p>
      </CardContent>
    </Card>
  );
}
