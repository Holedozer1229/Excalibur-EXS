#!/usr/bin/env bash
# Initialize fair_lattice on localnet or devnet after deploy (initialize → setup_pool → seed_vault).
set -euo pipefail

CLUSTER="${CLUSTER:-localnet}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_DIR="$ROOT/solana/fair_lattice"

. /usr/local/cargo/env 2>/dev/null || true
export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:/usr/local/cargo/bin:$PATH"

if [[ "$CLUSTER" == "mainnet-beta" ]]; then
  solana config set --url mainnet-beta
  export ANCHOR_PROVIDER_URL="${SOLANA_MAINNET_RPC:-https://api.mainnet-beta.solana.com}"
elif [[ "$CLUSTER" == "devnet" ]]; then
  solana config set --url devnet
  export ANCHOR_PROVIDER_URL="https://api.devnet.solana.com"
else
  solana config set --url localhost
  export ANCHOR_PROVIDER_URL="http://127.0.0.1:8899"
fi

export ANCHOR_WALLET="${ANCHOR_WALLET:-$HOME/.config/solana/id.json}"
export CLUSTER
export ROOT

cd "$PROGRAM_DIR"

PROGRAM_ID=$(solana-keygen pubkey target/deploy/fair_lattice-keypair.json 2>/dev/null || true)
if [[ -z "$PROGRAM_ID" ]]; then
  echo "Missing program keypair — run deploy-solana.sh first"
  exit 1
fi

echo "==> Waiting for program $PROGRAM_ID on $CLUSTER..."
for i in $(seq 1 30); do
  if solana program show "$PROGRAM_ID" &>/dev/null; then
    echo "    Program deployed (attempt $i)"
    break
  fi
  if [[ "$i" -eq 30 ]]; then
    echo "Program not deployed after 30 attempts — run deploy-solana.sh first"
    exit 1
  fi
  sleep 1
done

export ANCHOR_PROGRAM_ID="$PROGRAM_ID"

node <<'NODE'
const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram, Keypair } = require("@solana/web3.js");
const { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } = require("@solana/spl-token");
const fs = require("fs");
const path = require("path");

const cluster = process.env.CLUSTER || "localnet";
const root = process.env.ROOT || path.join(__dirname, "..");
const outPath = path.join(root, "src/lib/solana/deployments", cluster + ".json");

function writeDeployment(provider, program, lattice, mint) {
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(outPath, "utf8")); } catch {}
  const out = {
    ...existing,
    cluster,
    programId: program.programId.toBase58(),
    lattice: lattice.toBase58(),
    mint: mint.toBase58(),
    rpc: provider.connection.rpcEndpoint,
    initializedAt: new Date().toISOString(),
  };
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log("Wrote", outPath);
  return out;
}

(async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const programId = new PublicKey(process.env.ANCHOR_PROGRAM_ID);
  const idl = JSON.parse(fs.readFileSync(path.join(root, "src/lib/solana/fair_lattice.json"), "utf8"));
  const program = new anchor.Program(idl, provider);
  const wallet = provider.wallet;

  const [lattice] = PublicKey.findProgramAddressSync([Buffer.from("lattice")], programId);
  try {
    const state = await program.account.latticeState.fetch(lattice);
    console.log("Lattice already initialized:", lattice.toBase58());
    writeDeployment(provider, { programId }, lattice, state.mint);
    process.exit(0);
  } catch {}

  const [solVault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), lattice.toBuffer()], programId);
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

  const out = writeDeployment(provider, { programId }, lattice, mint);
  console.log("Initialized lattice:", JSON.stringify(out, null, 2));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
NODE

bash "$ROOT/scripts/sync-solana-to-public.sh"
echo "==> Lattice init complete ($CLUSTER)"
