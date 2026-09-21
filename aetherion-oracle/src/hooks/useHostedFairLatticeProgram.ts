import { useEffect, useMemo, useState } from "react";
import { Program, AnchorProvider, type Idl } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { fetchHostedIdl } from "@/lib/solana/hostedProgram";

/** Load Anchor program from IDL hosted on the React server (/solana/fair_lattice.json). */
export function useHostedFairLatticeProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [idl, setIdl] = useState<Idl | null>(null);
  const [idlSource, setIdlSource] = useState<"hosted" | "bundled" | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/solana/fair_lattice.json", { cache: "no-cache" });
        if (res.ok) {
          const json = (await res.json()) as Idl;
          if (alive) {
            setIdl(json);
            setIdlSource("hosted");
            return;
          }
        }
      } catch {
        /* fallback */
      }
      const bundled = await fetchHostedIdl();
      if (alive) {
        setIdl(bundled);
        setIdlSource("bundled");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const program = useMemo(() => {
    if (!idl || !wallet.publicKey || !wallet.signTransaction) return null;
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions!,
      },
      { commitment: "confirmed" },
    );
    return new Program(idl, provider);
  }, [connection, idl, wallet]);

  return { program, idl, idlSource, loading: !idl };
}
