import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useHostedFairLatticeProgram } from "@/hooks/useHostedFairLatticeProgram";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  associatedTokenAddress,
  latticePda,
  referralAttributePda,
  refCodeBytes,
  solVaultPda,
} from "@/lib/solana/fairLatticeProgram";
import { getStoredReferralCode } from "@/lib/funnel";
import PoweredByUI3 from "@/components/PoweredByUI3";

export default function SolanaLatticePanel() {
  const wallet = useWallet();
  const { program, idlSource, loading } = useHostedFairLatticeProgram();
  const [solIn, setSolIn] = useState("0.1");
  const [tokensIn, setTokensIn] = useState("1000");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [lattice] = useMemo(() => latticePda(), []);

  const recordReferral = useCallback(
    async (lamports: number, refStr: string) => {
      if (!program || !wallet.publicKey || !refStr) return;
      const refCode = refCodeBytes(refStr);
      const referrer = wallet.publicKey;
      const [refAttr] = referralAttributePda(referrer, wallet.publicKey, refCode);
      await program.methods
        .recordAttribute([...refCode], new BN(lamports))
        .accountsPartial({
          payer: wallet.publicKey,
          referrer,
          trader: wallet.publicKey,
          referralAttribute: refAttr,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    },
    [program, wallet.publicKey],
  );

  const buy = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    setBusy(true);
    setStatus(null);
    try {
      const lamports = Math.floor(Number(solIn) * 1e9);
      const state = await (program.account as any).latticeState.fetch(lattice);
      const mint = state.mint as PublicKey;
      const [vault] = solVaultPda(lattice);
      const buyerToken = associatedTokenAddress(mint, wallet.publicKey);
      const refStr = getStoredReferralCode() ?? "";
      const refCode = refCodeBytes(refStr);

      const sig = await program.methods
        .buy(new BN(lamports), [...refCode])
        .accountsPartial({
          buyer: wallet.publicKey,
          lattice,
          mint,
          tokenVault: associatedTokenAddress(mint, lattice, true),
          buyerToken,
          solVault: vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      if (refStr) {
        await recordReferral(lamports, refStr);
      }

      setStatus(`Buy confirmed: ${sig.slice(0, 16)}…`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusy(false);
    }
  }, [program, wallet.publicKey, solIn, lattice, recordReferral]);

  const sell = useCallback(async () => {
    if (!program || !wallet.publicKey) return;
    setBusy(true);
    setStatus(null);
    try {
      const amount = Math.floor(Number(tokensIn) * 1e9);
      const state = await (program.account as any).latticeState.fetch(lattice);
      const mint = state.mint as PublicKey;
      const [vault] = solVaultPda(lattice);
      const sellerToken = associatedTokenAddress(mint, wallet.publicKey);
      const refCode = refCodeBytes(getStoredReferralCode() ?? "");

      const sig = await program.methods
        .sell(new BN(amount), [...refCode])
        .accountsPartial({
          seller: wallet.publicKey,
          lattice,
          mint,
          tokenVault: associatedTokenAddress(mint, lattice, true),
          sellerToken,
          solVault: vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      setStatus(`Sell confirmed: ${sig.slice(0, 16)}…`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Transaction failed");
    } finally {
      setBusy(false);
    }
  }, [program, wallet.publicKey, tokensIn, lattice]);

  return (
    <Card className="mb-10 border-accent/30 bg-card/60" data-testid="solana-lattice-panel">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg uppercase tracking-widest text-accent">
              Live Solana swap
            </h2>
            <PoweredByUI3 className="mt-1 normal-case tracking-widest" />
            {idlSource && (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                IDL: {idlSource === "hosted" ? "/solana/fair_lattice.json" : "bundled"}
              </p>
            )}
          </div>
          <WalletMultiButton className="!h-8 !text-xs" />
        </div>
        {loading && (
          <p className="text-sm text-muted-foreground">Loading hosted program from React server…</p>
        )}
        <p className="text-sm text-muted-foreground">
          Buy and sell wURUU on-chain through the fair lattice program. 1% fee cap is enforced
          in the program. Referral volume from <code className="text-xs">aetherion_ref</code> is
          written via a separate <code className="text-xs">record_attribute</code> instruction
          after each buy.
        </p>

        <Tabs defaultValue="buy">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buy">Buy</TabsTrigger>
            <TabsTrigger value="sell">Sell</TabsTrigger>
          </TabsList>
          <TabsContent value="buy" className="space-y-3 pt-3">
            <div className="space-y-2">
              <Label htmlFor="sol-live-in">SOL in</Label>
              <Input
                id="sol-live-in"
                type="number"
                min="0"
                step="any"
                value={solIn}
                onChange={(e) => setSolIn(e.target.value)}
              />
            </div>
            <Button type="button" disabled={!wallet.connected || busy} onClick={buy}>
              {busy ? "Sending…" : "Buy wURUU on Solana"}
            </Button>
          </TabsContent>
          <TabsContent value="sell" className="space-y-3 pt-3">
            <div className="space-y-2">
              <Label htmlFor="token-live-in">wURUU in</Label>
              <Input
                id="token-live-in"
                type="number"
                min="0"
                step="any"
                value={tokensIn}
                onChange={(e) => setTokensIn(e.target.value)}
              />
            </div>
            <Button type="button" disabled={!wallet.connected || busy} onClick={sell}>
              {busy ? "Sending…" : "Sell wURUU for SOL"}
            </Button>
          </TabsContent>
        </Tabs>

        {status && <p className="font-mono text-xs text-muted-foreground">{status}</p>}
      </CardContent>
    </Card>
  );
}
