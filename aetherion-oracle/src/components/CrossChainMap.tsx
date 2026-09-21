// Cross-chain liquidity map: SKYNT (Ethereum) ↔ URUU (zkSync) ↔ wURUU (Solana)
// ↔ ATART (Bitcoin). Presentational only — no wallet, no RPC.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftRight, Link2, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CROSS_CHAIN_NODES,
  edgesFromNodes,
  fetchCrossChainNodes,
  type CrossChainNode,
} from "@/data/crossChain";

export default function CrossChainMap() {
  const [nodes, setNodes] = useState<CrossChainNode[]>(CROSS_CHAIN_NODES);

  useEffect(() => {
    let alive = true;
    fetchCrossChainNodes().then((rows) => {
      if (alive && rows.length) setNodes(rows);
    });
    return () => {
      alive = false;
    };
  }, []);

  const edges = edgesFromNodes(nodes);

  return (
    <section aria-labelledby="crosschain-heading" className="space-y-4">
      <div className="flex items-center gap-2">
        <Waves className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2
          id="crosschain-heading"
          className="font-display text-2xl uppercase tracking-widest text-primary"
        >
          Cross-chain lattice
        </h2>
      </div>
      <p className="text-sm md:text-base leading-relaxed text-foreground/90">
        Four legs, one liquidity surface. Ethereum carries the SKYNT/WETH
        pair, zkSync hosts live URUU, Solana hosts the custom two-way wURUU
        curve (1% maximum protocol fee), and         Bitcoin issues ATART as a
        BRC-20. Wheeler&apos;s &ldquo;it from bit&rdquo; lives on{" "}
        <Link to="/lattice/bit" className="text-primary hover:underline">
          /lattice/bit
        </Link>
        . Any wrap of immutable URUU is opt-in and not live. See the{" "}
        <Link to="/token/lattice" className="text-primary hover:underline">
          fair lattice
        </Link>{" "}
        for the curve.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((n) => (
          <Card key={n.tick} className="bg-card/60 backdrop-blur-sm">
            <CardContent className="space-y-2 p-4">
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                {n.chain}
              </Badge>
              <Link to={n.href} className={`font-mono text-lg hover:underline ${n.accent}`}>{n.tick}</Link>
              <div className="font-mono text-xs text-muted-foreground">{n.standard}</div>
              <div className="text-sm font-medium">{n.venue}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">{n.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <ul className="grid gap-2 sm:grid-cols-2">
        {edges.map((e) => (
          <li
            key={`${e.from}-${e.to}`}
            className="flex items-center gap-2 rounded-md border border-border bg-card/40 px-3 py-2 text-xs backdrop-blur-sm"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="font-mono">{e.from}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-mono">{e.to}</span>
            <span className="ml-auto text-muted-foreground">{e.label}</span>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
        <span>
          <strong>URUU</strong> — live on zkSync Era. Wrap is opt-in and not
          live. No exclusive relayer. Curve:{" "}
          <Link to="/token/lattice" className="text-primary hover:underline">
            fair lattice
          </Link>
          {" · "}
          <Link to="/token/uruu" className="text-primary hover:underline">
            contract
          </Link>
          {" · "}
          <Link to="/bridge?mode=mainnet" className="text-primary hover:underline">
            SphinxOS zkEVM bridge
          </Link>
          {" · "}
          <Link to="/bridge?mode=faucet-lab" className="text-primary hover:underline">
            Faucet lab
          </Link>
          .
        </span>
      </div>
    </section>
  );
}
