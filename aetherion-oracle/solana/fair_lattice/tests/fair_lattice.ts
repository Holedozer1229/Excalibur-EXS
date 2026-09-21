import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { FairLattice } from "../target/types/fair_lattice";

describe("fair_lattice", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.FairLattice as Program<FairLattice>;
  const wallet = provider.wallet as anchor.Wallet;

  const [lattice] = PublicKey.findProgramAddressSync(
    [Buffer.from("lattice")],
    program.programId,
  );
  const [solVault] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), lattice.toBuffer()],
    program.programId,
  );

  let mint: PublicKey;
  let mintKp: Keypair | null = null;
  let tokenVault: PublicKey;

  async function ensureInitialized() {
    try {
      const existing = await program.account.latticeState.fetch(lattice);
      mint = existing.mint;
      tokenVault = getAssociatedTokenAddressSync(mint, lattice, true);
      return;
    } catch {
      /* fresh init */
    }

    mintKp = Keypair.generate();
    mint = mintKp.publicKey;
    tokenVault = getAssociatedTokenAddressSync(mint, lattice, true);

    await program.methods
      .initializeLattice(new anchor.BN(100_000), new anchor.BN(10_000_000), 250, 10_000)
      .accountsPartial({
        authority: wallet.publicKey,
        lattice,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .setupPool()
      .accountsPartial({
        authority: wallet.publicKey,
        lattice,
        mint,
        tokenVault,
        solVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers(mintKp ? [mintKp] : [])
      .rpc();

    await program.methods
      .seedVault(new anchor.BN("1000000000000"))
      .accountsPartial({
        authority: wallet.publicKey,
        lattice,
        mint,
        tokenVault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  }

  it("records referral attributes", async () => {
    const refCode = Buffer.alloc(16);
    Buffer.from(`REF${Date.now()}`).copy(refCode);
    const referrer = wallet.publicKey;
    const [refAttr] = PublicKey.findProgramAddressSync(
      [Buffer.from("ref_attr"), referrer.toBuffer(), wallet.publicKey.toBuffer(), refCode],
      program.programId,
    );

    await program.methods
      .recordAttribute([...refCode], new anchor.BN(50_000_000))
      .accountsPartial({
        payer: wallet.publicKey,
        referrer,
        trader: wallet.publicKey,
        referralAttribute: refAttr,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const attr = await program.account.referralAttribute.fetch(refAttr);
    expect(attr.volumeLamports.toNumber()).to.equal(50_000_000);
    expect(attr.swapCount).to.equal(1);
  });

  it("initializes lattice, pool, seeds vault, buys wURUU", async () => {
    await ensureInitialized();

    const state = await program.account.latticeState.fetch(lattice);
    expect(state.feeBps).to.equal(10_000);
    expect(state.mint.equals(mint)).to.be.true;

    const refCode = Buffer.alloc(16);
    const buyerToken = getAssociatedTokenAddressSync(mint, wallet.publicKey);

    await program.methods
      .buy(new anchor.BN(100_000_000), [...refCode])
      .accountsPartial({
        buyer: wallet.publicKey,
        lattice,
        mint,
        tokenVault,
        buyerToken,
        solVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const bal = await provider.connection.getTokenAccountBalance(buyerToken);
    expect(Number(bal.value.amount)).to.be.greaterThan(0);
  });

  it("sells wURUU back through the curve", async () => {
    await ensureInitialized();

    const buyerToken = getAssociatedTokenAddressSync(mint, wallet.publicKey);
    const balBefore = await provider.connection.getTokenAccountBalance(buyerToken);
    const tokensIn = Math.floor(Number(balBefore.value.amount) / 2);
    expect(tokensIn).to.be.greaterThan(0);

    const refCode = Buffer.alloc(16);

    await program.methods
      .sell(new anchor.BN(tokensIn), [...refCode])
      .accountsPartial({
        seller: wallet.publicKey,
        lattice,
        mint,
        tokenVault,
        sellerToken: buyerToken,
        solVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const state = await program.account.latticeState.fetch(lattice);
    expect(state.totalVolumeLamports.toNumber()).to.be.greaterThan(0);
  });
});
