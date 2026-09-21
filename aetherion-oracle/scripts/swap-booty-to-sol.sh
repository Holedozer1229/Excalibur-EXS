#!/usr/bin/env bash
# Swap full 137 ETH booty → SOL (Wormhole L1 + Jupiter on Solana).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  🏴‍☠️  SWAP BOOTY — 137 ETH → ~2,286 SOL                        ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "==> [1/3] Unit tests (bootySolSwap)"
npm test -- src/lib/bootySolSwap.test.ts src/lib/bootyBridge.test.ts

echo "==> [2/3] Attempt zkStarknet claim (release ETH to vault)"
npm run claim:zkstarknet 2>/dev/null || echo "    ⊘ Claim skipped — set TREASURE_BRIDGE_PRIVATE_KEY"

echo "==> [3/3] Wormhole ETH → SOL swap"
npx --yes tsx "$ROOT/scripts/swap-booty-to-sol.mjs" || {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  SWAP INCOMPLETE — fund L1 ETH + set signing key               ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  1. TREASURE_BRIDGE_PRIVATE_KEY=0x… npm run swap:booty         ║"
  echo "║  2. Or send ≥2286 SOL to $(solana address 2>/dev/null || echo SOLANA_WALLET)"
  echo "╚══════════════════════════════════════════════════════════════╝"
  exit 1
}

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  SWAP PIPELINE COMPLETE — check Solana wallet for SOL         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
