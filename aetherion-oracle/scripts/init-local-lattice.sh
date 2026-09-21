#!/usr/bin/env bash
# Initialize fair_lattice on localnet after deploy (initialize → setup_pool → seed_vault).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_DIR="$ROOT/solana/fair_lattice"

. /usr/local/cargo/env 2>/dev/null || true
export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:/usr/local/cargo/bin:$PATH"

cd "$PROGRAM_DIR"
solana config set --url localhost

anchor run test -- --skip-local-validator --skip-build --skip-deploy 2>/dev/null || true

node <<'NODE'
const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Keypair } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } = require("@solana/spl-token");
const fs = require("fs");

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.FairLattice;
  const wallet = provider.wallet;

  const [lattice] = PublicKey.findProgramAddressSync([Buffer.from("lattice")], program.programId);
  try {
    await program.account.latticeState.fetch(lattice);
    console.log("Lattice already initialized:", lattice.toBase58());
    process.exit(0);
  } catch {}

  const [solVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), lattice.toBuffer()], program.programId);
  const mintKp = Keypair.generate();
  const mint = mintKp.publicKey;
  const tokenVault = getAssociatedTokenAddressSync(mint, lattice, true);

  await program.methods.initializeLattice(new anchor.BN(100_000), new anchor.BN(10_000_000), 250, 10_000)
    .accountsPartial({ authority: wallet.publicKey, lattice, systemProgram: SystemProgram.programId })
    .rpc();

  await program.methods.setupPool()
    .accountsPartial({
      authority: wallet.publicKey, lattice, mint, tokenVault, solVault,
      tokenProgram: TOKEN_PROGRAM_ID, associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .signers([mintKp])
    .rpc();

  await program.methods.seedVault(new anchor.BN("1000000000000"))
    .accountsPartial({ authority: wallet.publicKey, lattice, mint, tokenVault, tokenProgram: TOKEN_PROGRAM_ID })
    .rpc();

  const out = {
    cluster: "localnet",
    programId: program.programId.toBase58(),
    lattice: lattice.toBase58(),
    mint: mint.toBase58(),
    rpc: "http://127.0.0.1:8899",
    deployedAt: new Date().toISOString(),
  };
  fs.writeFileSync(`${process.env.ROOT || ".."}/src/lib/solana/deployments/localnet.json`, JSON.stringify(out, null, 2));
  console.log("Initialized lattice:", out);
})();
NODE
