#!/usr/bin/env bash
# Bridge Davy Jones booty → Solana deploy wallet → mainnet program deploy.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🏴‍☠️  BRIDGE BOOTY — treasure vault → SOL → fair_lattice      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "==> [1/6] Treasure + zkStarknet claim tests"
npm test -- src/lib/bootyBridge.test.ts src/lib/pirateTreasureFunding.test.ts src/lib/zkStarknetClaim.test.ts

echo "==> [2/6] Generate zkStarknet mainnet claim (137 ETH)"
SKYNT_EXPORT_PATH="${SKYNT_EXPORT_PATH:-}" SOLANA_DEPLOY_WALLET="${SOLANA_DEPLOY_WALLET:-$(solana address 2>/dev/null || true)}" \
  bash "$ROOT/scripts/generate-zkstarknet-claim.sh" || true

echo "==> [3/6] Attempt zkStarknet mainnet claim broadcast"
npx --yes tsx "$ROOT/scripts/claim-zkstarknet-mainnet.mjs" && echo "    ✓ zkStarknet claim sent" || \
  echo "    ⊘ Claim not broadcast — set TREASURE_BRIDGE_PRIVATE_KEY + zkSync gas"

echo "==> [4/6] Wormhole micro-claim path"
if node "$ROOT/scripts/bridge-booty-exec.mjs"; then
  echo "    ✓ Claim path executed"
else
  echo "    ⊘ Bridge blocked (see above) — set TREASURE_BRIDGE_PRIVATE_KEY + fund vault/signer"
fi

echo "==> [5/6] Swap booty ETH → SOL (full 137 ETH scale)"
if npx --yes tsx "$ROOT/scripts/swap-booty-to-sol.mjs"; then
  echo "    ✓ Swap pipeline complete"
else
  echo "    ⊘ Swap blocked — L1 ETH + signing key required (npm run swap:booty)"
fi

echo "==> [6/6] Solana mainnet fund check"
if bash "$ROOT/scripts/fund-mainnet.sh"; then
  echo "==> [4/5] Deploy Solana mainnet program"
  CLUSTER=mainnet-beta bash "$ROOT/scripts/deploy-solana.sh"
  CLUSTER=mainnet-beta bash "$ROOT/scripts/init-lattice.sh"
  echo "==> [6/6] Sync artifacts + build"
  npm run build
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  BOOTY BRIDGE COMPLETE — Solana mainnet live                   ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  cat "$ROOT/src/lib/solana/deployments/mainnet-beta.json" 2>/dev/null || true
else
  echo "==> [6/6] Devnet fallback faucet (bootstrap until mainnet SOL arrives)"
  solana config set --url devnet >/dev/null
  TARGET_SOL=3 bash "$ROOT/scripts/fund-devnet.sh" 2>/dev/null && \
    CLUSTER=devnet bash "$ROOT/scripts/plunder-fund-rollup.sh" || \
    echo "    ⊘ Devnet faucet also rate-limited — fund ${SOLANA_DEPLOY_WALLET:-$(solana address)} with SOL"
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  BOOTY BRIDGE INCOMPLETE — fund Solana wallet to finish        ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Wallet: $(solana address 2>/dev/null || echo unknown)"
  echo "║  Need:   ≥5 SOL mainnet (or ~2286 SOL @ full 137 ETH oracle)"
  echo "║  Vault:  0xc5a47c9adab637d1caa791cce193079d22c8cb20"
  echo "╚══════════════════════════════════════════════════════════════╝"
  exit 1
fi
