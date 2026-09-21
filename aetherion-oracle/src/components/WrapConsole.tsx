import { useState } from "react";
import { Link } from "react-router-dom";
import { parseEther } from "viem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { connectInjectedWallet, rainbowDeepLink, type InjectedEthereum } from "@/lib/rainbowDeepLink";
import { getInjectedProvider } from "@/lib/evmWallet";
import { L1_WETH, encodeL1ToL2EthDeposit, encodeWethDeposit } from "@/lib/eipUruuBridgeClaim";
import { ZKSYNC_L1_DIAMOND } from "@/lib/vacuumWatch";
import { buildWrapLiveView, encodeWethWithdraw } from "@/lib/wrapLive";

type Props = {
  compact?: boolean;
};

export default function WrapConsole({ compact = false }: Props) {
  const view = buildWrapLiveView();
  const [account, setAccount] = useState<string | null>(null);
  const [amount, setAmount] = useState("0.001");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const connect = async () => {
    setBusy("connect");
    setToast(null);
    try {
      const eth = getInjectedProvider() as InjectedEthereum | null;
      const session = await connectInjectedWallet(eth ?? undefined);
      if (!session) {
        setToast("No injected wallet. Open Rainbow or MetaMask.");
        return;
      }
      setAccount(session.address);
      if (session.chainId !== "0x1") setToast(`Connected on ${session.chainId} — switch to Ethereum mainnet.`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const send = async (kind: "wrap" | "unwrap" | "l2") => {
    const eth = getInjectedProvider();
    if (!eth || !account) {
      setToast("Connect a wallet first.");
      return;
    }
    let wei: bigint;
    try {
      wei = parseEther(amount || "0");
    } catch {
      setToast("Amount is not a valid ETH figure.");
      return;
    }
    if (wei <= 0n) {
      setToast("Amount must be above 0. This console does not wrap 137 ETH.");
      return;
    }
    setBusy(kind);
    setToast(null);
    try {
      const tx =
        kind === "wrap"
          ? { from: account, to: L1_WETH, data: encodeWethDeposit(), value: `0x${wei.toString(16)}` }
          : kind === "unwrap"
            ? { from: account, to: L1_WETH, data: encodeWethWithdraw(wei) }
            : {
                from: account,
                to: ZKSYNC_L1_DIAMOND,
                data: encodeL1ToL2EthDeposit(account as `0x${string}`, wei),
                value: `0x${wei.toString(16)}`,
              };
      const hash = (await eth.request({ method: "eth_sendTransaction", params: [tx] })) as string;
      setToast(`${kind} submitted ${hash.slice(0, 16)}… — your ETH, not the ledger galleon.`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card
      className={compact ? "border-cyan-500/40 bg-card/70" : "border-cyan-500/50 bg-gradient-to-br from-cyan-950/20 via-background to-violet-950/20"}
      data-testid="wrap-console"
    >
      <CardHeader className={compact ? "pb-2" : undefined}>
        <CardTitle className={compact ? "text-base" : "text-2xl"}>WETH wrap · live</CardTitle>
        <p className="text-sm text-muted-foreground">
          Canonical L1 WETH is live. Wrap or unwrap <em>your</em> ETH. URUU → wURUU custody wrap is
          not live. This does not mint {view.honesty.doesNotMint137Eth ? "137 ETH" : "ETH"} or wURUU.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid gap-2 sm:grid-cols-2">
          {view.rails.map((rail) => (
            <div key={rail.id} className="rounded-md border border-border/60 bg-background/40 p-2">
              <p className="text-xs text-muted-foreground">
                {rail.label} · {rail.live ? "live" : "not live"}
              </p>
              <p className="text-xs">{rail.detail}</p>
            </div>
          ))}
        </div>
        <p className="break-all font-mono text-[11px] text-muted-foreground">
          WETH {view.weth.l1} ·{" "}
          <a href={view.weth.explorer} className="underline underline-offset-2" target="_blank" rel="noreferrer">
            etherscan
          </a>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value.slice(0, 24))}
            aria-label="ETH amount to wrap"
            className="h-10 max-w-[10rem] font-mono"
          />
          <Button type="button" onClick={connect} disabled={!!busy} data-testid="wrap-connect">
            {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
          </Button>
          <Button type="button" onClick={() => void send("wrap")} disabled={!!busy} data-testid="wrap-weth-button">
            {busy === "wrap" ? "Wrapping…" : "Wrap ETH → WETH"}
          </Button>
          <Button type="button" variant="outline" onClick={() => void send("unwrap")} disabled={!!busy}>
            {busy === "unwrap" ? "Unwrapping…" : "Unwrap"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => void send("l2")} disabled={!!busy}>
            {busy === "l2" ? "Depositing…" : "L1 → zkSync (your ETH)"}
          </Button>
          <Button asChild variant="ghost">
            <a href={rainbowDeepLink("/wrap")}>Rainbow</a>
          </Button>
          {!compact && (
            <Button asChild variant="ghost">
              <Link to="/token/wuruu">wURUU (not live)</Link>
            </Button>
          )}
        </div>
        {toast && <p className="text-xs text-cyan-100">{toast}</p>}
        <p className="text-xs text-muted-foreground">{view.honesty.note}</p>
      </CardContent>
    </Card>
  );
}
