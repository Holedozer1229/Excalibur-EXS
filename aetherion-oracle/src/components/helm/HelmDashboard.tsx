import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink, Flame, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { HELM_PIPELINES, parseFeedHint, type FeedHint } from "@/lib/helmPipelines";
import { clearBurnerWallet, createBurnerWallet, loadOrCreateBurner, type BurnerWallet } from "@/lib/burnerWallet";
import { connectInjectedWallet, rainbowDeepLink } from "@/lib/rainbowDeepLink";
import { LAST_VACUUM_NET_WEI } from "@/lib/engineSelfFund";
import { ETH_USD_ORACLE } from "@/lib/pirateTreasureFunding";
import { buildContractAtlas, type OptimizeStep } from "@/lib/contractAtlas";
import type { LiveMainnetLedger } from "@/lib/liveMainnetLedger";
import {
  AUTO_BOOTSTRAP_API,
  AUTO_BOOTSTRAP_PATH,
  millionaireWindow,
  type AutoBootstrap,
} from "@/lib/autoBootstrap";
import {
  BITCOIN_GENESIS_ADDRESS,
  CREATE2_FACTORY,
  CREATE2_SALT_SHORT,
  EXCAL_CREATE2_PREDICTED,
  EXCAL_PASTE_18,
  EXCAL_POSTED_ALLOC,
  EXCAL_STATUS_PATH,
  opReturnLast20,
  type ExcalCreate2Status,
} from "@/lib/eip7949Excal";
import { EIP7949_GENESIS_DOWNLOAD } from "@/lib/eip7949Genesis";
import { EIP_CONFORMANCE_PATH, type EipConformance } from "@/lib/eipConformance";
import { COMMITMENT_CHAIN_PATH, type CommitmentChain } from "@/lib/commitmentChain";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function preferRainbowKind(): "web" | "scheme" {
  if (typeof navigator !== "undefined" && /iPhone|iPad|Android/i.test(navigator.userAgent)) {
    return "scheme";
  }
  return "web";
}

const STATUS_CLASS: Record<string, string> = {
  "live-read": "border-emerald-500/40 text-emerald-200",
  "fail-closed": "border-amber-500/40 text-amber-200",
  "token-live": "border-cyan-500/40 text-cyan-200",
  predicted: "border-violet-500/40 text-violet-200",
};

export default function HelmDashboard() {
  const [burner, setBurner] = useState<BurnerWallet | null>(null);
  const [injected, setInjected] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [feeds, setFeeds] = useState<Record<string, FeedHint>>({});
  const [ledger, setLedger] = useState<LiveMainnetLedger | null>(null);
  const [optimize, setOptimize] = useState<OptimizeStep[]>(() => buildContractAtlas().optimize);
  const [excal, setExcal] = useState<ExcalCreate2Status | null>(null);
  const [boot, setBoot] = useState<AutoBootstrap | null>(null);
  const [eip, setEip] = useState<EipConformance | null>(null);
  const [chain, setChain] = useState<CommitmentChain | null>(null);
  const [clock, setClock] = useState(() => millionaireWindow());
  const [refreshing, setRefreshing] = useState(false);

  const rainbowWeb = useMemo(() => rainbowDeepLink("/", "web"), []);
  const rainbowApp = useMemo(() => rainbowDeepLink("/", "app"), []);
  const rainbowScheme = useMemo(() => rainbowDeepLink("/", "scheme"), []);
  const rainbowHref = preferRainbowKind() === "scheme" ? rainbowScheme : rainbowWeb;

  useEffect(() => {
    setBurner(loadOrCreateBurner());
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setClock(millionaireWindow()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const loadFeeds = useCallback(async () => {
    setRefreshing(true);
    const next: Record<string, FeedHint> = {};
    await Promise.all(
      HELM_PIPELINES.filter((p) => p.feed).map(async (p) => {
        try {
          const res = await fetch(`${p.feed}?t=${Date.now()}`);
          if (!res.ok) return;
          const json = (await res.json()) as Record<string, unknown>;
          next[p.id] = parseFeedHint(p.label, p.status, json);
          if (p.id === "ledger" && json.kind === "live-mainnet-ledger") {
            setLedger(json as unknown as LiveMainnetLedger);
          }
        } catch {
          /* feed optional */
        }
      }),
    );
    setFeeds(next);
    try {
      const [atlas, ex, live, snap, eipRes, chainRes] = await Promise.all([
        fetch(`/treasure/contract-atlas.json?t=${Date.now()}`),
        fetch(`${EXCAL_STATUS_PATH}?t=${Date.now()}`),
        fetch(`${AUTO_BOOTSTRAP_API}?t=${Date.now()}`),
        fetch(`${AUTO_BOOTSTRAP_PATH}?t=${Date.now()}`),
        fetch(`${EIP_CONFORMANCE_PATH}?t=${Date.now()}`),
        fetch(`${COMMITMENT_CHAIN_PATH}?t=${Date.now()}`),
      ]);
      if (atlas.ok) {
        const json = (await atlas.json()) as { optimize?: OptimizeStep[] };
        if (json.optimize?.length) setOptimize(json.optimize);
      }
      if (ex.ok) setExcal((await ex.json()) as ExcalCreate2Status);
      if (live.ok) setBoot((await live.json()) as AutoBootstrap);
      else if (snap.ok) setBoot((await snap.json()) as AutoBootstrap);
      if (eipRes.ok) setEip((await eipRes.json()) as EipConformance);
      if (chainRes.ok) setChain((await chainRes.json()) as CommitmentChain);
    } catch {
      /* static atlas already loaded */
    }
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadFeeds();
  }, [loadFeeds]);

  const mintBurner = useCallback(() => {
    setBurner(createBurnerWallet());
  }, []);

  const copyText = useCallback(async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setErr("clipboard blocked");
    }
  }, []);

  const connectRainbow = useCallback(async () => {
    setErr(null);
    const eth = (window as unknown as { ethereum?: Parameters<typeof connectInjectedWallet>[0] }).ethereum;
    try {
      const session = await connectInjectedWallet(eth);
      if (session) {
        setInjected(session.address);
        return;
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "wallet rejected");
    }
    window.open(rainbowHref, "_blank", "noopener,noreferrer");
  }, [rainbowHref]);

  const stockUsd = ((Number(LAST_VACUUM_NET_WEI) / 1e18) * ETH_USD_ORACLE).toFixed(2);
  const liveUsd = ledger?.totals.nativeUsd.toFixed(2) ?? stockUsd;
  const helmAddress = injected ?? burner?.address ?? null;

  return (
    <section id="helm" className="w-full scroll-mt-20" data-testid="helm-dashboard">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Mainnet helm</p>
          <h2 className="font-saga text-2xl sm:text-3xl">Dashboard · auto-bootstrap · every pipeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Leftover ≈ ${stockUsd} once. $1M in 72h needs new leftover, not more replicas of this well.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="tracking-[0.18em] uppercase text-[10px]">
            Live reads · no invented 137 ETH
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => void loadFeeds()} disabled={refreshing}>
            <RefreshCw className={`mr-1 h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3" data-testid="helm-stock-strip">
        <Card className="border-violet-500/25 bg-card/40">
          <CardContent className="space-y-1 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Keyed leftover</p>
            <p className="font-saga text-2xl" data-testid="helm-live-usd">
              ${liveUsd}
            </p>
            <p className="text-xs text-muted-foreground">
              {ledger ? `${ledger.totals.nativeEth.toFixed(6)} ETH · ${ledger.mode}` : "vacuum well · stock, not a wage"}
            </p>
          </CardContent>
        </Card>
        <Card className="border-cyan-500/25 bg-card/40">
          <CardContent className="space-y-1 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">EXCAL CREATE2</p>
            <p className="font-saga text-2xl">{excal?.predictedHasCode ? "live" : "predicted"}</p>
            <p className="font-mono text-[10px] text-muted-foreground">
              {`${(excal?.predicted ?? EXCAL_CREATE2_PREDICTED).slice(0, 8)}…`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/25 bg-card/40">
          <CardContent className="space-y-1 p-4">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Autoscale</p>
            <p className="font-saga text-2xl">{boot?.autoscale.replicas ?? 1}×</p>
            <p className="text-xs text-muted-foreground">{boot?.autoscale.reason ?? "operator_empty"}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4 border-rose-500/25 bg-card/40" data-testid="helm-72h-honesty">
        <CardContent className="space-y-2 p-5">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">72h millionaire gap — honest</p>
            <p className="font-mono text-sm" data-testid="helm-72h-clock">
              {boot?.millionaire.window?.remainingLabel ?? clock.remainingLabel} left
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Target $1,000,000 / 72h ≈ $
            {(boot?.millionaire.usdPerHourNeeded ?? 13888.89).toLocaleString()}/hr of{" "}
            <span className="text-foreground">new</span> leftover. This well is ${liveUsd} once, then $0/hr.
            Multiple needed ≈ {(boot?.millionaire.multipleNeeded ?? 56148).toLocaleString()}×. Autoscale does not mint
            yield. The clock ticks; the stock does not grow.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Cron {boot?.deploy?.cron ?? "17 3 * * *"} (Vercel daily) · GH{" "}
            {boot?.deploy?.watchCron ?? "17 */6 * * *"} · API {boot?.deploy?.api ?? "/api/auto-bootstrap"} ·{" "}
            {boot?.broadcast ?? "FAIL_CLOSED"}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-violet-500/30 bg-card/40" data-testid="helm-wallet-card">
          <CardContent className="space-y-3 p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">SDK burner wallet</p>
            <p className="font-mono text-lg" data-testid="helm-burner-address">
              {burner ? shortAddr(burner.address) : "…"}
            </p>
            <p className="text-xs text-muted-foreground">
              Session-only viem key. Address is shown; the secret never leaves this tab and is not a vault key.
              {burner?.source === "session" ? " Restored from this tab." : " Fresh mint."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={mintBurner}>
                <Flame className="mr-2 h-3.5 w-3.5" /> New burner
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!burner}
                onClick={() => burner && void copyText("burner", burner.address)}
              >
                <Copy className="mr-2 h-3.5 w-3.5" /> {copied === "burner" ? "Copied" : "Copy"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearBurnerWallet();
                  setBurner(null);
                }}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/30 bg-card/40" data-testid="helm-rainbow-card">
          <CardContent className="space-y-3 p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Rainbow Wallet</p>
            <p className="font-mono text-lg">{injected ? shortAddr(injected) : "not connected"}</p>
            <p className="text-xs text-muted-foreground">
              Injected Rainbow if present, otherwise the official deep link opens this dapp in Rainbow.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => void connectRainbow()}>
                <Wallet className="mr-2 h-3.5 w-3.5" /> Connect / open Rainbow
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={rainbowWeb} target="_blank" rel="noreferrer">
                  Web <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={rainbowApp} target="_blank" rel="noreferrer">
                  App
                </a>
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <a href={rainbowScheme}>rainbow://</a>
              </Button>
              {injected && (
                <Button size="sm" variant="ghost" onClick={() => void copyText("rainbow", injected)}>
                  <Copy className="mr-2 h-3.5 w-3.5" /> {copied === "rainbow" ? "Copied" : "Copy"}
                </Button>
              )}
            </div>
            {err && <p className="text-xs text-destructive">{err}</p>}
          </CardContent>
        </Card>
      </div>

      {helmAddress && (
        <p className="mt-3 text-center font-mono text-[11px] text-muted-foreground" data-testid="helm-session-identity">
          Session helm · {shortAddr(helmAddress)}
          {injected ? " · Rainbow" : " · burner"}
        </p>
      )}

      <Card className="mt-6 border-amber-500/30 bg-card/40" data-testid="helm-excal-attestation">
        <CardContent className="space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              EIP-7949 · Camelot Excalibur · genesis attestation
            </p>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
              {excal?.predictedHasCode ? "token-live" : "CREATE2 pending"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Factory live. Salt {CREATE2_SALT_SHORT}. Posted alloc {shortAddr(EXCAL_POSTED_ALLOC)} is the EIP-7949
            counterfactual label — live no code, do not sweep. Compiled CREATE2 is{" "}
            {shortAddr(excal?.predicted ?? EXCAL_CREATE2_PREDICTED)}. Posted {EXCAL_PASTE_18} is the 18-byte OP_RETURN
            tail. Bitcoin genesis is attestation-only.
          </p>
          <dl className="grid gap-2 text-[11px] font-mono sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Factory</dt>
              <dd className="break-all">{CREATE2_FACTORY}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Compiled CREATE2</dt>
              <dd className="break-all">{excal?.predicted ?? EXCAL_CREATE2_PREDICTED}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Posted alloc (do not sweep)</dt>
              <dd className="break-all">{EXCAL_POSTED_ALLOC}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Genesis (never sweep)</dt>
              <dd className="break-all">{BITCOIN_GENESIS_ADDRESS}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-3 text-xs">
            <a
              href={EIP7949_GENESIS_DOWNLOAD}
              download
              className="text-amber-200 underline underline-offset-4 hover:text-amber-100"
            >
              Download genesis-mainnet.json
            </a>
            <Link to="/live-ledger" className="text-amber-200 underline underline-offset-4 hover:text-amber-100">
              mintByMnemonic · getGenesisAttestation · live ledger →
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-500/25 bg-card/40" data-testid="helm-eip-console">
          <CardContent className="space-y-3 p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              EIP conformance · Ethereum
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(eip?.checks ?? []).map((c) => (
                <Badge key={c.id} variant="outline" className="text-[10px] uppercase tracking-wider text-emerald-200">
                  {c.id} {c.status}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              EIP-2 low-s · header {eip?.eip2.header ?? 31} / v {eip?.eip2.ethereumV ?? 27}. EIP-3326 switches Rainbow
              to 0x1 (4902 adds the chain). EIP-6: no SELFDESTRUCT. Posted display hash is{" "}
              {eip?.hashes.postedDisplayBytes ?? 33} bytes; on-chain is keccak256(GENESIS_MESSAGE).
            </p>
            <p className="font-mono text-[10px] break-all text-muted-foreground">
              on-chain {eip?.hashes.onChainKeccak ?? "…"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-violet-500/25 bg-card/40" data-testid="helm-commitment-chain">
          <CardContent className="space-y-3 p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Commitment chain</p>
            <dl className="grid gap-1.5 text-[11px] font-mono">
              <div>
                <dt className="text-muted-foreground">Lock</dt>
                <dd className="break-all">{chain?.lockCommitment ?? "…"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">VAA</dt>
                <dd className="break-all">{chain?.vaaHash ?? "…"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sphinx (L, R)</dt>
                <dd>
                  ({chain?.sphinxLR.L ?? 64595395}, {chain?.sphinxLR.R ?? 834306506}) · AIR{" "}
                  {chain?.air.satisfied ?? "12/12"}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Solvency {chain?.solvency.postedEth ?? 138} ≥ {chain?.solvency.canonicalEth ?? 137.190325} ETH is
              SKYNT / proof-ledger — not an L1 balance. Do not sweep.
            </p>
          </CardContent>
        </Card>
      </div>

      {boot?.steps?.length ? (
        <Card className="mt-4 border-border/50 bg-card/25" data-testid="helm-bootstrap-steps">
          <CardContent className="space-y-2 p-5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Auto-bootstrap steps</p>
            <ul className="grid gap-1 text-xs sm:grid-cols-2">
              {boot.steps.map((s) => (
                <li key={s.id} className={s.ok ? "text-emerald-200" : "text-amber-200"}>
                  {s.ok ? "✔" : "○"} {s.id} · {s.detail}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-testid="helm-pipeline-grid">
        {HELM_PIPELINES.map((p) => (
          <Link key={p.id} to={p.path} className="group">
            <Card className="h-full border-border/50 bg-card/30 transition-colors group-hover:border-violet-500/50">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-saga text-base">{p.label}</h3>
                  <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${STATUS_CLASS[p.status]}`}>
                    {p.status}
                  </Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{p.blurb}</p>
                {feeds[p.id] && (
                  <p className="font-mono text-xs text-violet-200">{feeds[p.id].value}</p>
                )}
                <p className="text-[10px] font-mono text-muted-foreground/80">{p.script}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 border-border/50 bg-card/25" data-testid="helm-optimize">
        <CardContent className="space-y-3 p-5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Profit flow to optimize</p>
          <ol className="space-y-2 text-sm leading-relaxed">
            {optimize.slice(0, 3).map((step) => (
              <li key={step.id}>
                <span className="font-medium text-foreground">
                  {step.rank}. {step.title}
                </span>
                <p className="text-xs text-muted-foreground">{step.why}</p>
              </li>
            ))}
          </ol>
          <p className="text-xs">
            <Link to="/live-ledger" className="text-violet-200 underline underline-offset-4 hover:text-violet-100">
              Full atlas + live RPC ledger →
            </Link>
          </p>
        </CardContent>
      </Card>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        <RefreshCw className="mr-1 inline h-3 w-3" />
        Feeds refresh on load from <span className="font-mono">/treasure/*.json</span>. Broadcasts stay fail-closed
        without L1 gas.
      </p>
    </section>
  );
}
