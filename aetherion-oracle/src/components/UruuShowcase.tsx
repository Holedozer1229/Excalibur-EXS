/**
 * Homepage URUU showcase — live zkSync Era token, Aetherion neon palette.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Coins, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackEvent } from "@/lib/funnel";
import {
  URUU_ADDRESS,
  URUU_BLOCKSCOUT_API,
  URUU_CHAIN,
  URUU_EXPLORER,
  URUU_FALLBACK_META,
  URUU_TICK,
  parseUruuTokenMeta,
  uruuShort,
} from "@/lib/uruu";
import { MAX_PROTOCOL_FEE_PERCENT } from "@/lib/fairLattice";

type Props = { className?: string };

export default function UruuShowcase({ className = "" }: Props) {
  const [holders, setHolders] = useState<number | null>(null);
  const [supply, setSupply] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(URUU_BLOCKSCOUT_API);
        if (!res.ok) throw new Error("blockscout");
        const json = await res.json();
        const meta = parseUruuTokenMeta(json);
        setHolders(meta.holdersCount);
        setSupply(meta.totalSupply);
      } catch {
        setHolders(URUU_FALLBACK_META.holdersCount);
        setSupply(URUU_FALLBACK_META.totalSupply);
      }
    })();
  }, []);

  return (
    <section
      className={`w-full ${className}`}
      aria-labelledby="uruu-showcase-heading"
      data-testid="uruu-showcase"
    >
      <div className="mb-4 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          Mainnet live · zkSync Era
        </p>
      </div>
      <Card className="overflow-hidden border-violet-500/40 bg-gradient-to-br from-violet-600/15 via-fuchsia-600/10 to-cyan-600/10 backdrop-blur">
        <CardContent className="grid gap-6 p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Coins className="h-5 w-5 text-violet-200" />
              <Badge className="border-violet-400/40 bg-violet-500/20 text-[10px] uppercase tracking-widest text-violet-100">
                {URUU_CHAIN} · ERC-20
              </Badge>
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                Token live
              </Badge>
            </div>
            <h2 id="uruu-showcase-heading" className="font-saga text-3xl sm:text-4xl">
              <span className="bg-gradient-to-r from-violet-200 via-fuchsia-200 to-cyan-200 bg-clip-text text-transparent">
                {URUU_TICK}
              </span>
              {" "}— Camelot liquidity rail
            </h2>
            <p className="mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Immutable ERC-20 on zkSync Era at{" "}
              <span className="font-mono text-violet-200">{uruuShort}</span>. Pair with the fair
              lattice bonding curve ({MAX_PROTOCOL_FEE_PERCENT}% max fee) — buy, bridge, and explore on
              SphinxOS.
            </p>
            <dl className="mt-4 flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
              <div>
                <dt className="uppercase tracking-wider">Contract</dt>
                <dd className="text-foreground/90">{URUU_ADDRESS.slice(0, 10)}…</dd>
              </div>
              {supply && (
                <div>
                  <dt className="uppercase tracking-wider">Supply</dt>
                  <dd className="text-foreground/90">{supply}</dd>
                </div>
              )}
              {holders !== null && (
                <div>
                  <dt className="uppercase tracking-wider">Holders</dt>
                  <dd className="text-foreground/90">{holders.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-[200px]">
            <Button
              asChild
              size="lg"
              className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:from-violet-500 hover:to-fuchsia-500"
            >
              <Link
                to="/buy/uruu"
                onClick={() => void trackEvent("buy_uruu_visit", { via: "home_showcase" })}
              >
                Buy {URUU_TICK}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-violet-500/40">
              <Link to="/token/uruu">Token details</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-muted-foreground">
              <a href={URUU_EXPLORER} target="_blank" rel="noreferrer">
                Blockscout
                <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
