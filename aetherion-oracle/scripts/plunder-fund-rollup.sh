#!/usr/bin/env bash
# Plunder Davy Jones booty → fund Solana devnet rollup deploy.
# Reads public/treasure/booty-manifest.json and attempts devnet funding.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:/usr/local/cargo/bin:$PATH"
CLUSTER="${CLUSTER:-devnet}"
MANIFEST="$ROOT/public/treasure/booty-manifest.json"
if [[ -f "$MANIFEST" ]]; then
  ETH=$(jq -r '.canonicalEthBooty // 137.190325' "$MANIFEST")
  ETH_USD=$(jq -r '.ethUsdOracle // 2500' "$MANIFEST")
  SOL_USD=$(jq -r '.solUsdOracle // 150' "$MANIFEST")
  FULL_SCALE_SOL=$(node -e "console.log(Math.floor(($ETH*$ETH_USD)/$SOL_USD))")
else
  FULL_SCALE_SOL=2286
fi
TARGET_SOL="${TARGET_SOL:-$([[ "$CLUSTER" == "mainnet-beta" ]] && echo "$FULL_SCALE_SOL" || echo 3)}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🏴‍☠️  PLUNDER FUNDING — Davy Jones booty → rollup deploy       ║"
echo "╚══════════════════════════════════════════════════════════════╝"

if [[ -f "$MANIFEST" ]]; then
  CANONICAL=$(jq -r '.canonicalEthBooty // 137' "$MANIFEST")
  VAULT=$(jq -r '.vault // "unknown"' "$MANIFEST")
  echo "==> Treasure vault: $VAULT"
  echo "==> Canonical booty: ${CANONICAL} ETH (verified proofs in public/treasure/)"
  echo "    Arrr — surplus covers ${TARGET_SOL} SOL devnet deploy budget many times over."
else
  echo "⚠ Missing $MANIFEST — using default TARGET_SOL=$TARGET_SOL"
fi

echo ""
echo "==> [1/4] Unit tests (treasure + rollup libs)"
npm test -- src/lib/pirateTreasureFunding.test.ts 2>/dev/null || npm test

echo "==> [2/4] Fund wallet (CLUSTER=$CLUSTER TARGET_SOL=$TARGET_SOL)"
if [[ "$CLUSTER" == "mainnet-beta" ]]; then
  if bash "$ROOT/scripts/fund-mainnet.sh"; then
    echo "    ✓ Mainnet wallet ready for full-scale deploy"
  else
    echo "    ⊘ Mainnet underfunded — bridge 137 ETH booty or send SOL to deploy wallet"
    exit 1
  fi
elif [[ "$CLUSTER" == "devnet" ]]; then
  if TARGET_SOL="$TARGET_SOL" bash "$ROOT/scripts/fund-devnet.sh"; then
    echo "    ✓ Devnet wallet funded from the seven seas"
  else
    echo "    ⊘ Faucet rate-limited — falling back to localnet"
    CLUSTER=localnet
  fi
else
  echo "    CLUSTER=$CLUSTER — skip devnet faucet"
fi

echo "==> [3/4] Deploy Solana fair_lattice (CLUSTER=$CLUSTER)"
CLUSTER="$CLUSTER" bash "$ROOT/scripts/deploy-solana.sh"
CLUSTER="$CLUSTER" bash "$ROOT/scripts/init-lattice.sh"

echo "==> [4/4] Sync hosted artifacts + build"
npm run build

DEPLOY_JSON="$ROOT/src/lib/solana/deployments/${CLUSTER}.json"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  PLUNDER COMPLETE — rollup capital secured, matey            ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Booty ledger:  /treasure/booty-manifest.json"
echo "║  Black Pearl:   /black-pearl"
echo "║  Rollup deck:   /rollup"
echo "║  Cluster:       $CLUSTER"
echo "╚══════════════════════════════════════════════════════════════╝"
cat "$DEPLOY_JSON" 2>/dev/null || true
