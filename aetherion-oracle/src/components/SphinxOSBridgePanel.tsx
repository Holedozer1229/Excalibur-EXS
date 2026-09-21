/**
 * SphinxOS Bridge — Aetherion lattice console for zkEVM ↔ Solana.
 * Default: Faucet lab (Cardona + zkSync Sepolia + Solana Devnet).
 * Optional: Mainnet lattice for live URUU on zkSync Era.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRightLeft,
  CheckCircle2,
  Circle,
  ExternalLink,
  Droplets,
  Loader2,
  Shield,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SphinxOSMark from "@/components/SphinxOSMark";
import PoweredByUI3 from "@/components/PoweredByUI3";
import {
  allFaucets,
  BRIDGE_PROFILES,
  DEFAULT_BRIDGE_MODE,
  parseBridgeMode,
  type BridgeMode,
  type BridgeProfile,
} from "@/lib/bridgeNetworks";
import { bridgeWalletDeepLinks } from "@/lib/walletDeepLinks";
import {
  connectEvmWallet,
  detectWalletName,
  formatEth,
  getErc20Balance,
  getEvmChainId,
  getInjectedProvider,
  getNativeBalance,
  switchOrAddChain,
  watchUruuToken,
} from "@/lib/evmWallet";
import SolanaErrorBoundary from "@/components/solana/SolanaErrorBoundary";
import { AETHERION, SPHINX_OS } from "@/lib/brand";

const SolanaLiveSection = lazy(() => import("@/components/solana/SolanaLiveSection"));

type StepId = "wallet" | "chain" | "faucet" | "token" | "solana" | "wrap";

const STEP_LABELS: Record<StepId, string> = {
  wallet: "Connect EVM wallet",
  chain: "Switch to source chain",
  faucet: "Fund via faucet",
  token: "Watch URUU / verify balance",
  solana: "Connect Solana + fund SOL",
  wrap: "Bridge / wrap checklist",
};

const MODE_ORDER: BridgeMode[] = ["mainnet", "faucet-lab"];

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export default function SphinxOSBridgePanel({ className = "" }: { className?: string }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setModeState] = useState<BridgeMode>(() =>
    parseBridgeMode(searchParams.get("mode")),
  );
  const profile = BRIDGE_PROFILES[mode];
  const deepLinks = useMemo(() => bridgeWalletDeepLinks("/bridge?mode=mainnet"), []);

  const setMode = (next: BridgeMode) => {
    setModeState(next);
    setDone({});
    setToast(null);
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.set("mode", next);
        return p;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    const fromUrl = parseBridgeMode(searchParams.get("mode"));
    setModeState((cur) => (cur === fromUrl ? cur : fromUrl));
  }, [searchParams]);

  const [account, setAccount] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("—");
  const [chainId, setChainId] = useState<number | null>(null);
  const [ethBal, setEthBal] = useState<string>("—");
  const [uruuBal, setUruuBal] = useState<string>("—");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [done, setDone] = useState<Partial<Record<StepId, boolean>>>({});
  const [faucetsOpened, setFaucetsOpened] = useState(0);

  const refreshBalances = useCallback(
    async (addr: string, p: BridgeProfile) => {
      try {
        const wei = await getNativeBalance(addr);
        setEthBal(`${formatEth(wei)} ${p.source.nativeCurrency.symbol}`);
        if (p.uruuAddress) {
          const raw = await getErc20Balance(p.uruuAddress, addr);
          setUruuBal(formatEth(raw, 2));
        } else {
          setUruuBal("n/a (lab)");
        }
      } catch {
        setEthBal("—");
        setUruuBal("—");
      }
    },
    [],
  );

  const refreshChain = useCallback(async () => {
    const id = await getEvmChainId();
    setChainId(id);
    return id;
  }, []);

  useEffect(() => {
    const eth = getInjectedProvider();
    setWalletName(detectWalletName(eth));
    if (!eth?.on) return;
    const onAccounts = (...args: unknown[]) => {
      const accs = args[0] as string[] | undefined;
      setAccount(accs?.[0] ?? null);
    };
    const onChain = () => {
      void refreshChain();
    };
    eth.on("accountsChanged", onAccounts);
    eth.on("chainChanged", onChain);
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts);
      eth.removeListener?.("chainChanged", onChain);
    };
  }, [refreshChain]);

  useEffect(() => {
    if (account) void refreshBalances(account, profile);
  }, [account, profile, refreshBalances]);

  const mark = (id: StepId) => setDone((d) => ({ ...d, [id]: true }));

  const onConnect = async () => {
    setBusy("connect");
    setToast(null);
    try {
      const addr = await connectEvmWallet();
      setAccount(addr);
      setWalletName(detectWalletName(getInjectedProvider()));
      await refreshChain();
      mark("wallet");
      setToast(`Connected ${shortAddr(addr)}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onSwitch = async (which: "source" | "zkevm") => {
    setBusy(`switch-${which}`);
    setToast(null);
    try {
      const chain = which === "source" ? profile.source : profile.zkevm;
      await switchOrAddChain(chain);
      const id = await refreshChain();
      if (id === chain.chainId) mark("chain");
      setToast(`Switched to ${chain.name}`);
      if (account) await refreshBalances(account, profile);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onWatch = async () => {
    setBusy("watch");
    setToast(null);
    try {
      if (mode === "mainnet") {
        await switchOrAddChain(profile.source);
        await watchUruuToken();
        mark("token");
        setToast("URUU added to wallet watch list");
      } else {
        mark("token");
        setToast(
          "Faucet lab: skip mainnet URUU watch — fund Sepolia/Cardona then open Solana Devnet below",
        );
      }
      if (account) await refreshBalances(account, profile);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const onFaucetOpened = () => {
    setFaucetsOpened((n) => n + 1);
    mark("faucet");
    setToast("Faucet opened — claim drip, then switch wallet to that chain");
  };
  const onSolanaReady = () => mark("solana");
  const onWrapAck = () => {
    mark("wrap");
    setToast(
      profile.wrapLive
        ? "Wrap live — submit on-chain when ready"
        : "Faucet lab checklist complete. Wrap is not live custody — do not send funds to demo addresses.",
    );
  };

  const faucets = allFaucets(profile);
  const onSource = chainId === profile.source.chainId;
  const onZkevm = chainId === profile.zkevm.chainId;
  const isLab = mode === "faucet-lab";

  return (
    <section
      className={`space-y-6 ${className}`}
      data-testid="sphinxos-bridge-panel"
      data-bridge-mode={mode}
      aria-labelledby="sphinxos-bridge-heading"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <SphinxOSMark className="mb-3" />
          <h2
            id="sphinxos-bridge-heading"
            className="font-display text-2xl uppercase tracking-widest text-primary md:text-3xl"
          >
            {SPHINX_OS} Bridge
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {AETHERION} defaults to <strong className="text-foreground">Mainnet lattice</strong>:
            connect MetaMask or Rainbow on zkSync Era (324) for live URUU, then switch to Polygon
            zkEVM (1101) for SphinxOS attestation. Use Faucet lab to dry-run with public drips.
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Bridge mode">
          {MODE_ORDER.map((m) => (
            <Button
              key={m}
              type="button"
              size="sm"
              variant={mode === m ? "default" : "outline"}
              onClick={() => setMode(m)}
              data-testid={`bridge-mode-${m}`}
            >
              {BRIDGE_PROFILES[m].title}
            </Button>
          ))}
        </div>
      </div>

      {isLab && (
        <div
          role="status"
          className="rounded-md border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
          data-testid="faucet-lab-banner"
        >
          <strong className="text-accent">Faucet lab active.</strong>{" "}
          <span className="text-foreground/90">
            Open each faucet below, switch MetaMask/Rainbow to that chain, then fund Solana Devnet
            and run the lattice panel. Mode:{" "}
            <code className="font-mono text-xs">{DEFAULT_BRIDGE_MODE}</code>
            {faucetsOpened > 0
              ? ` · ${faucetsOpened} faucet link${faucetsOpened === 1 ? "" : "s"} opened`
              : ""}
            .
          </span>
        </div>
      )}

      {!isLab && (
        <div
          role="status"
          className="rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm"
          data-testid="mainnet-bridge-banner"
        >
          <strong className="text-primary">Mainnet lattice.</strong>{" "}
          <span className="text-foreground/90">
            Connect MetaMask or Rainbow on zkSync Era (324) for live URUU. Polygon zkEVM (1101) is
            the SphinxOS attestation surface. Solana wrap is staged — switch to Faucet lab to
            exercise the Devnet program with public drips.
          </span>
        </div>
      )}

      <Card className="border-primary/30 bg-card/70 backdrop-blur-sm">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
              {profile.title}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              {profile.source.name} · {profile.source.chainId}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              {profile.zkevm.name} · {profile.zkevm.chainId}
            </Badge>
            <Badge variant="secondary" className="text-[10px] uppercase tracking-widest">
              {profile.solana.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{profile.blurb}</p>

          <div className="flex flex-wrap gap-2">
            {deepLinks.map((l) => (
              <Button key={l.id} asChild variant="outline" size="sm" className="gap-2">
                <a href={l.href} target="_blank" rel="noopener noreferrer" data-testid={`deeplink-${l.id}`}>
                  <Wallet className="h-3.5 w-3.5" />
                  {l.label}
                  <ExternalLink className="h-3 w-3 opacity-60" />
                </a>
              </Button>
            ))}
          </div>

          <div className="grid gap-3 rounded-md border border-border/60 bg-background/40 p-4 sm:grid-cols-2">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Wallet</p>
              <p className="font-mono text-sm">{walletName}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {account ? shortAddr(account) : "Not connected"}
              </p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Chain / balances
              </p>
              <p className="font-mono text-sm">
                {chainId != null ? `chainId ${chainId}` : "—"}
                {onSource && " · source"}
                {onZkevm && " · zkEVM"}
              </p>
              <p className="font-mono text-xs text-muted-foreground">
                ETH {ethBal} · URUU {uruuBal}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void onConnect()} disabled={!!busy} className="gap-2">
              {busy === "connect" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
              {account ? "Reconnect" : "Connect MetaMask / Rainbow"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onSwitch("source")}
              disabled={!!busy || !account}
              className="gap-2"
            >
              {busy === "switch-source" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Switch to {profile.source.name}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onSwitch("zkevm")}
              disabled={!!busy || !account}
              className="gap-2"
            >
              {busy === "switch-zkevm" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Switch to {profile.zkevm.name}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void onWatch()}
              disabled={!!busy || !account}
              className="gap-2"
            >
              {busy === "watch" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {isLab ? "Mark token step" : "Watch URUU"}
            </Button>
          </div>

          {toast && (
            <p className="text-xs text-accent" role="status" data-testid="bridge-toast">
              {toast}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-accent/30 bg-card/60 backdrop-blur-sm">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm uppercase tracking-widest">
              {isLab ? "Faucet lab drips" : "Faucets"}
            </h3>
          </div>
          {faucets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Mainnet has no public ETH faucet. Switch to{" "}
              <button
                type="button"
                className="text-primary underline"
                onClick={() => setMode("faucet-lab")}
              >
                Faucet lab
              </button>{" "}
              for Cardona + Sepolia + Solana Devnet drips.
            </p>
          ) : (
            <ol className="grid gap-2">
              {faucets.map((f, i) => (
                <li key={f.url}>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onFaucetOpened}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-3 text-sm transition-colors hover:border-accent/50 hover:bg-muted/40"
                    data-testid="faucet-link"
                  >
                    <span className="flex items-start gap-3">
                      <span className="font-mono text-xs text-accent">{i + 1}</span>
                      <span>
                        <span className="font-medium">{f.label}</span>
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{f.leg}</span>
                      </span>
                    </span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  </a>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            <h3 className="font-display text-sm uppercase tracking-widest">Bridge checklist</h3>
          </div>
          <ol className="space-y-2">
            {(Object.keys(STEP_LABELS) as StepId[]).map((id) => (
              <li key={id} className="flex items-center gap-2 text-sm">
                {done[id] ? (
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={done[id] ? "text-foreground" : "text-muted-foreground"}>
                  {STEP_LABELS[id]}
                </span>
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onSolanaReady}>
              Mark Solana ready
            </Button>
            <Button type="button" size="sm" onClick={onWrapAck} data-testid="bridge-wrap-ack">
              Complete wrap checklist
            </Button>
            {profile.uruuExplorer && (
              <Button asChild variant="outline" size="sm">
                <a href={profile.uruuExplorer} target="_blank" rel="noopener noreferrer">
                  URUU explorer
                </a>
              </Button>
            )}
            <Button asChild variant="outline" size="sm">
              <Link to="/token/lattice">Fair lattice</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/buy/uruu">Buy URUU</Link>
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Opt-in wrap is not a live custody bridge. SphinxOS faucet lab surfaces the path; never
            send URUU or SOL to undocumented addresses.
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-widest text-accent">
            Solana leg · {profile.solana.label}
          </h3>
          {profile.solana.faucetUrl && (
            <Button asChild variant="outline" size="sm" className="gap-2">
              <a
                href={profile.solana.faucetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onFaucetOpened}
              >
                <Droplets className="h-3.5 w-3.5" />
                {profile.solana.faucetLabel}
              </a>
            </Button>
          )}
        </div>
        {profile.solana.programLive ? (
          <SolanaErrorBoundary>
            <Suspense fallback={<p className="text-sm text-muted-foreground">Loading Solana wallet…</p>}>
              <SolanaLiveSection cluster="devnet" />
            </Suspense>
          </SolanaErrorBoundary>
        ) : (
          <Card className="bg-card/50">
            <CardContent className="space-y-2 p-5 text-sm text-muted-foreground">
              <p>
                Fair lattice program is live on{" "}
                <strong className="text-foreground">Solana Devnet</strong>. Mainnet wrap is staged —
                stay in Faucet lab to exercise buy/sell with faucet SOL.
              </p>
              <Button type="button" size="sm" onClick={() => setMode("faucet-lab")}>
                Open faucet lab
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <PoweredByUI3 />
    </section>
  );
}
