/**
 * Browser wallet panel — swap 137 ETH booty → SOL via Wormhole (MetaMask/Rainbow).
 */
import { useCallback, useMemo, useState } from "react";
import { ArrowRightLeft, ExternalLink, Loader2, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  buildBootySolSwapPlan,
  encodeWrapAndTransferEth,
  solanaPubkeyToBytes32,
  WORMHOLE_TOKEN_BRIDGE_ETH,
} from "@/lib/bootySolSwap";
import { CANONICAL_BOOTY_ETH, TREASURE_VAULT } from "@/lib/pirateTreasureFunding";
import {
  connectEvmWallet,
  detectWalletName,
  formatEth,
  getInjectedProvider,
  getNativeBalance,
  switchOrAddChain,
} from "@/lib/evmWallet";
import { bridgeWalletDeepLinks } from "@/lib/walletDeepLinks";
import { PublicKey } from "@solana/web3.js";

const SOL_DEPLOY_WALLET = "ESs5u7DPeq7h8SMgYfL8t4M5X2QXc3PtjEUaMhADU9yt";
const ETH_MAINNET = {
  chainId: 1,
  hexChainId: "0x1" as const,
  name: "Ethereum Mainnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://ethereum.publicnode.com"],
  blockExplorerUrls: ["https://etherscan.io"],
};

type Props = { className?: string };

export default function BootySwapPanel({ className = "" }: Props) {
  const [account, setAccount] = useState<string | null>(null);
  const [l1Wei, setL1Wei] = useState<bigint>(0n);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const deepLinks = useMemo(() => bridgeWalletDeepLinks("/black-pearl"), []);

  const recipientBytes32 = useMemo(() => {
    try {
      return solanaPubkeyToBytes32(new PublicKey(SOL_DEPLOY_WALLET).toBytes());
    } catch {
      return null;
    }
  }, []);

  const plan = useMemo(
    () =>
      buildBootySolSwapPlan(
        { ethereumWei: l1Wei, zksyncWei: 0n },
        SOL_DEPLOY_WALLET,
        recipientBytes32,
      ),
    [l1Wei, recipientBytes32],
  );

  const refresh = useCallback(async (addr: string) => {
    const bal = await getNativeBalance(addr);
    setL1Wei(bal);
  }, []);

  const connect = async () => {
    setBusy(true);
    setToast(null);
    try {
      const addr = await connectEvmWallet();
      setAccount(addr);
      await switchOrAddChain(ETH_MAINNET);
      await refresh(addr);
      setToast(`Connected ${detectWalletName(getInjectedProvider())}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Connect failed");
    } finally {
      setBusy(false);
    }
  };

  const swapFullBooty = async () => {
    const eth = getInjectedProvider();
    if (!eth || !account || !recipientBytes32) return;
    setBusy(true);
    setToast(null);
    try {
      await switchOrAddChain(ETH_MAINNET);
      const canonicalWei = BigInt(Math.floor(CANONICAL_BOOTY_ETH * 1e18));
      const swapWei = l1Wei > canonicalWei ? canonicalWei : plan.bridgeableWei;
      if (swapWei === 0n) {
        setToast("No spendable L1 ETH — claim booty or deposit to vault first.");
        return;
      }
      const data = encodeWrapAndTransferEth({ recipient: recipientBytes32 });
      const hash = (await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: account,
            to: WORMHOLE_TOKEN_BRIDGE_ETH,
            data,
            value: `0x${swapWei.toString(16)}`,
          },
        ],
      })) as string;
      setToast(`Wormhole tx submitted: ${hash.slice(0, 14)}…`);
      void refresh(account);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Swap failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={`border-emerald-700/40 bg-gradient-to-br from-slate-950/95 via-emerald-950/10 to-slate-900/90 ${className}`}
      data-testid="booty-swap-panel"
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Badge className="mb-2 gap-1 bg-emerald-900/60 text-emerald-100 border-emerald-600/40">
              <ArrowRightLeft className="h-3 w-3" />
              ETH → SOL
            </Badge>
            <h2 className="font-display text-lg uppercase tracking-widest text-emerald-100">
              Swap {CANONICAL_BOOTY_ETH} ETH booty
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Wormhole L1 → Solana WETH → Jupiter. Target ~{plan.targetSol.toLocaleString()} SOL.
            </p>
          </div>
          <div className="text-right font-mono text-xs text-emerald-200/90">
            <p>Vault {TREASURE_VAULT.slice(0, 10)}…</p>
            <p>SOL → {SOL_DEPLOY_WALLET.slice(0, 8)}…</p>
          </div>
        </div>

        {account ? (
          <p className="font-mono text-xs text-muted-foreground">
            Signer {account.slice(0, 10)}… · L1 {formatEth(l1Wei)} ETH
          </p>
        ) : null}

        {plan.blockers.length > 0 && (
          <ul className="space-y-1 text-xs text-amber-300/90">
            {plan.blockers.slice(0, 2).map((b) => (
              <li key={b}>⊘ {b}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-emerald-700/50"
            disabled={busy}
            onClick={() => void connect()}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wallet className="h-3.5 w-3.5" />}
            {account ? "Refresh" : "Connect wallet"}
          </Button>
          <Button
            size="sm"
            className="gap-1 bg-emerald-700 hover:bg-emerald-600"
            disabled={busy || !account}
            onClick={() => void swapFullBooty()}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Swap via Wormhole
          </Button>
          <Button asChild size="sm" variant="ghost" className="gap-1 text-xs">
            <a
              href="https://portalbridge.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Portal redeem
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-emerald-900/30 pt-3">
          {deepLinks.map((d) => (
            <Button key={d.id} asChild size="sm" variant="outline" className="text-xs">
              <a href={d.href}>{d.label}</a>
            </Button>
          ))}
        </div>

        {toast ? <p className="text-xs text-emerald-200">{toast}</p> : null}

        <p className="font-mono text-[10px] text-muted-foreground">
          CLI: npm run swap:booty · Requires L1 ETH on signer · zkSync vault: withdraw first
        </p>
      </CardContent>
    </Card>
  );
}
