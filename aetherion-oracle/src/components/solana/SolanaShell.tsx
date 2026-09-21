import "@/lib/bufferPolyfill";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { clusterRpc, type ClusterName } from "@/lib/solana/fairLatticeProgram";
import { resolveSolanaRpc } from "@/lib/solana/hostedProgram";
import "@solana/wallet-adapter-react-ui/styles.css";

type Props = {
  cluster?: ClusterName;
  children: ReactNode;
};

export default function SolanaShell({ cluster = "devnet", children }: Props) {
  const [endpoint, setEndpoint] = useState(() => clusterRpc(cluster));

  useEffect(() => {
    resolveSolanaRpc(cluster).then(setEndpoint).catch(() => setEndpoint(clusterRpc(cluster)));
  }, [cluster]);

  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
