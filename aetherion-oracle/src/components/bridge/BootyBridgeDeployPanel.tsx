/**
 * Wallet-connected SphinxBootyBridge deploy wizard — Connect → Preflight → Deploy → Verify.
 * User wallet signs; no TREASURE_BRIDGE_PRIVATE_KEY required.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Loader2,
  Rocket,
  Shield,
  Wallet,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CANONICAL_BOOTY_ETH } from "@/lib/pirateTreasureFunding";
import {
  connectEvmWallet,
  detectWalletName,
  formatEth,
  getEvmChainId,
  getInjectedProvider,
  getNativeBalance,
  switchOrAddChain,
} from "@/lib/evmWallet";
import {
  BRIDGE_DEPLOY_ARTIFACT_PATH,
  buildDeployedArtifact,
  defaultBridgeDeployArtifact,
  downloadBridgeDeployArtifact,
  ETH_MAINNET,
  loadStoredBridgeDeploy,
  runBridgeDeployPreflight,
  saveStoredBridgeDeploy,
  waitForDeployReceipt,
  type BridgeDeployPreflight,
  type BridgeDeployStep,
  type StoredBridgeDeploy,
} from "@/lib/bridgeAutoDeploy";

const STEPS: { id: BridgeDeployStep; label: string }[] = [
  { id: "connect", label: "Connect wallet" },
  { id: "preflight", label: "Preflight" },
  { id: "deploy", label: "Deploy bridge" },
  { id: "verify", label: "Verify + zk claim" },
];

function stepIndex(step: BridgeDeployStep): number {
  return STEPS.findIndex((s) => s.id === step);
}

function shortAddr(a: string) {
  return `${a.slice(0, 8)}…${a.slice(-6)}`;
}

type Props = { className?: string; autoDeploy?: boolean };

export default function BootyBridgeDeployPanel({ className = "", autoDeploy = true }: Props) {
  const [account, setAccount] = useState<string | null>(null);
  const [walletName, setWalletName] = useState("—");
  const [chainId, setChainId] = useState<number | null>(null);
  const [balanceWei, setBalanceWei] = useState<bigint>(0n);
  const [preflight, setPreflight] = useState<BridgeDeployPreflight | null>(null);
  const [step, setStep] = useState<BridgeDeployStep>("connect");
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [stored, setStored] = useState<StoredBridgeDeploy | null>(() => loadStoredBridgeDeploy());
  const [deployTxHash, setDeployTxHash] = useState<string | null>(null);

  const refreshBalance = useCallback(async (addr: string) => {
    const bal = await getNativeBalance(addr);
    setBalanceWei(bal);
    return bal;
  }, []);

  const estimateGas = useCallback(async (deployData: `0x${string}`, from: string) => {
    const eth = getInjectedProvider();
    if (!eth) return null;
    const hex = (await eth.request({
      method: "eth_estimateGas",
      params: [{ from, data: deployData }],
    })) as string;
    return BigInt(hex);
  }, []);

  const runPreflight = useCallback(async () => {
    const cid = chainId ?? (await getEvmChainId());
    setChainId(cid);
    const pre = await runBridgeDeployPreflight({
      signerAddress: account,
      balanceWei,
      chainId: cid,
      estimateGas: account ? estimateGas : undefined,
    });
    setPreflight(pre);
    if (pre.ok) setStep("deploy");
    else setStep("preflight");
    return pre;
  }, [account, balanceWei, chainId, estimateGas]);

  const connect = async () => {
    setBusy("connect");
    setToast(null);
    try {
      const addr = await connectEvmWallet();
      setAccount(addr);
      setWalletName(detectWalletName(getInjectedProvider()));
      await switchOrAddChain(ETH_MAINNET);
      const cid = await getEvmChainId();
      setChainId(cid);
      await refreshBalance(addr);
      setStep("preflight");
      setToast(`Connected ${walletName} — run preflight on mainnet.`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(null);
    }
  };

  useEffect(() => {
    if (account && step === "preflight" && !preflight && !busy) {
      void runPreflight();
    }
  }, [account, step, preflight, busy, runPreflight]);

  const deploy = async () => {
    const eth = getInjectedProvider();
    if (!eth || !account || !preflight?.deployDataPreview) {
      setToast("Preflight must pass before deploy.");
      return;
    }
    setBusy("deploy");
    setToast(null);
    try {
      await switchOrAddChain(ETH_MAINNET);
      const hash = (await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            data: preflight.deployDataPreview,
          },
        ],
      })) as string;
      setDeployTxHash(hash);
      setToast(`Deploy submitted ${shortAddr(hash)} — waiting for confirmation…`);

      const receipt = await waitForDeployReceipt(eth, hash);
      if (!receipt.contractAddress || receipt.status === "0x0") {
        setToast("Deploy failed — no contract address or tx reverted.");
        setStep("preflight");
        return;
      }

      const artifact = buildDeployedArtifact({
        deployer: account,
        bridgeAddress: receipt.contractAddress,
        deployTxHash: hash,
        stateSig: preflight.stateSig!,
        vault: preflight.vault,
        bootyWei: preflight.bootyWei,
        bytecodeHash: preflight.bytecodeHash!,
        preflight,
      });

      const record: StoredBridgeDeploy = {
        bridgeAddress: receipt.contractAddress,
        deployTxHash: hash,
        deployer: account,
        deployedAt: new Date().toISOString(),
        stateSig: preflight.stateSig!,
        vault: preflight.vault,
        bootyWei: preflight.bootyWei,
        bytecodeHash: preflight.bytecodeHash!,
        artifact,
      };
      saveStoredBridgeDeploy(record);
      setStored(record);
      downloadBridgeDeployArtifact(artifact);
      setStep("verify");
      setToast(`Bridge deployed at ${shortAddr(receipt.contractAddress)} — artifact saved.`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Deploy failed — wallet rejected or insufficient gas.");
    } finally {
      setBusy(null);
      setConfirmOpen(false);
    }
  };

  const handleAutoDeployClick = async () => {
    if (!account) {
      await connect();
      return;
    }
    const pre = preflight ?? (await runPreflight());
    if (!pre.ok) {
      setToast(pre.blockers[0] ?? "Preflight failed — fund wallet with L1 ETH for gas.");
      return;
    }
    if (autoDeploy) setConfirmOpen(true);
    else await deploy();
  };

  const currentStepIdx = stepIndex(step);
  const defaultArtifact = useMemo(() => defaultBridgeDeployArtifact(), []);

  return (
    <Card
      className={`border-amber-700/40 bg-gradient-to-br from-slate-950/95 via-amber-950/10 to-slate-900/90 ${className}`}
      data-testid="booty-bridge-deploy-panel"
    >
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 gap-1 bg-amber-900/60 text-amber-100 border-amber-600/40">
              <Shield className="h-3 w-3" />
              L1 mainnet · wallet-signed
            </Badge>
            <h2 className="font-display text-lg uppercase tracking-widest text-amber-100">
              Deploy SphinxBootyBridge
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {CANONICAL_BOOTY_ETH} ETH is proof-ledger only until bridge holds balance. You pay real L1
              gas — not the ledger galleon.
            </p>
          </div>
          {stored?.bridgeAddress ? (
            <div className="text-right font-mono text-xs text-amber-200/90">
              <p>Deployed {shortAddr(stored.bridgeAddress)}</p>
              <a
                href={`https://etherscan.io/address/${stored.bridgeAddress}`}
                className="inline-flex items-center gap-1 underline underline-offset-2"
                target="_blank"
                rel="noreferrer"
              >
                etherscan <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ) : null}
        </div>

        <ol className="grid gap-2 sm:grid-cols-4">
          {STEPS.map((s, i) => {
            const done = i < currentStepIdx || (s.id === "verify" && stored?.bridgeAddress);
            const active = s.id === step;
            return (
              <li
                key={s.id}
                className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
                  active
                    ? "border-amber-500/60 bg-amber-950/30 text-amber-100"
                    : done
                      ? "border-emerald-700/40 text-emerald-200"
                      : "border-border/50 text-muted-foreground"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0" />
                )}
                {s.label}
              </li>
            );
          })}
        </ol>

        {account ? (
          <p className="font-mono text-xs text-muted-foreground">
            {walletName} · {shortAddr(account)} · chain {chainId ?? "?"} · {formatEth(balanceWei)} ETH
          </p>
        ) : null}

        {preflight && (
          <div className="space-y-2 rounded-md border border-border/60 bg-background/40 p-3 text-xs">
            <p className="font-medium text-amber-100">Preflight</p>
            <ul className="space-y-1 font-mono text-muted-foreground">
              <li>chainId={preflight.chainId ?? "?"} {preflight.chainOk ? "✓ mainnet" : "✗ not mainnet"}</li>
              <li>
                balance {preflight.balanceEth.toFixed(6)} ETH{" "}
                {preflight.balanceOk ? "✓" : "✗ need ≥0.005 ETH gas"}
              </li>
              <li>
                bytecode {preflight.bytecodeBytes} bytes{" "}
                {preflight.bytecodePresent ? "✓" : "✗ missing"}
                {preflight.bytecodeHash ? ` · ${preflight.bytecodeHash.slice(0, 14)}…` : ""}
              </li>
              {preflight.estimatedGas != null ? (
                <li>est. gas ~{(Number(preflight.estimatedGas) / 1e6).toFixed(0)}k units</li>
              ) : null}
            </ul>
            {preflight.blockers.length > 0 && (
              <ul className="mt-2 space-y-1 text-amber-200">
                {preflight.blockers.map((b) => (
                  <li key={b} className="flex gap-1.5">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {preflight.warnings.map((w) => (
              <p key={w} className="text-muted-foreground">
                {w}
              </p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!account ? (
            <Button type="button" onClick={connect} disabled={!!busy} data-testid="bridge-deploy-connect">
              {busy === "connect" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              Connect wallet
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void runPreflight()}
                disabled={!!busy}
                data-testid="bridge-deploy-preflight"
              >
                Run preflight
              </Button>
              <Button
                type="button"
                onClick={() => void handleAutoDeployClick()}
                disabled={!!busy}
                data-testid="bridge-deploy-auto"
              >
                {busy === "deploy" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Rocket className="mr-2 h-4 w-4" />
                )}
                {autoDeploy ? "Auto-deploy" : "Deploy bridge"}
              </Button>
            </>
          )}
          {stored?.artifact ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => downloadBridgeDeployArtifact(stored.artifact)}
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              Download artifact
            </Button>
          ) : null}
        </div>

        {step === "verify" && stored ? (
          <div className="rounded-md border border-emerald-700/40 bg-emerald-950/20 p-3 text-sm">
            <p className="font-medium text-emerald-100">Bridge live — next: zk claim</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-muted-foreground">
              <li>Fund bridge with booty ETH (depositBooty or treasury transfer)</li>
              <li>
                Dry-run: <code className="text-xs">{defaultArtifact.zkClaim.submitDryRun}</code>
              </li>
              <li>
                Live claim: <code className="text-xs">{defaultArtifact.zkClaim.submitLive}</code> (value 0)
              </li>
              <li>
                <Link to="/chipset" className="underline underline-offset-2">
                  ZK claim pipeline on /chipset
                </Link>
              </li>
            </ul>
          </div>
        ) : null}

        {toast ? (
          <p className="text-sm text-amber-100" role="status">
            {toast}
          </p>
        ) : null}

        <p className="text-[11px] text-muted-foreground">
          Static artifact template:{" "}
          <a href={BRIDGE_DEPLOY_ARTIFACT_PATH} className="underline underline-offset-2">
            {BRIDGE_DEPLOY_ARTIFACT_PATH}
          </a>
          . Successful deploys save to localStorage and trigger a{" "}
          <code className="text-[10px]">bridge-deploy.json</code> download — commit that file to{" "}
          <code className="text-[10px]">public/treasure/</code> if you want it on the site.
        </p>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" />
              Confirm bridge deploy
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Deploy <strong>SphinxBootyBridge</strong> on Ethereum mainnet from your wallet. You pay
                  gas in real ETH — the {CANONICAL_BOOTY_ETH} ETH proof-ledger does not fund this transaction.
                </p>
                {preflight?.estimatedGasEth != null ? (
                  <p>Estimated gas: ~{preflight.estimatedGasEth.toFixed(6)} ETH</p>
                ) : null}
                <p className="font-mono text-xs">Vault: {preflight?.vault ?? "—"}</p>
                {deployTxHash ? <p className="font-mono text-xs">Pending: {deployTxHash}</p> : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void deploy()} disabled={!!busy}>
              Sign & deploy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
