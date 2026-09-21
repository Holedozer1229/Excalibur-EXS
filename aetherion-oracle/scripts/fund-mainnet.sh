#!/usr/bin/env bash
# Verify mainnet-beta deploy wallet has enough SOL (booty → SOL budget from treasure manifest).
set -euo pipefail

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MANIFEST="$ROOT/public/treasure/booty-manifest.json"
PUBKEY="${1:-$(solana address)}"

solana config set --url mainnet-beta >/dev/null

if [[ -f "$MANIFEST" ]]; then
  ETH=$(jq -r '.canonicalEthBooty // 137.190325' "$MANIFEST")
  ETH_USD=$(jq -r '.ethUsdOracle // 2500' "$MANIFEST")
  SOL_USD=$(jq -r '.solUsdOracle // 150' "$MANIFEST")
  TARGET_SOL=$(node -e "const e=$ETH,u=$ETH_USD,s=$SOL_USD; console.log(Math.max(5, Math.floor((e*u)/s)));")
else
  TARGET_SOL="${TARGET_SOL:-2286}"
fi

BAL=$(solana balance "$PUBKEY" 2>/dev/null | awk '{print $1}' || echo "0")
echo "==> Mainnet wallet $PUBKEY"
echo "    Balance: ${BAL} SOL"
echo "    Required (137 ETH booty @ oracle): ${TARGET_SOL} SOL"

if awk "BEGIN {exit !($BAL >= $TARGET_SOL)}"; then
  echo "    ✓ Wallet funded for full-scale mainnet deploy"
  exit 0
fi

# Program deploy + init needs far less than full booty — allow minimum path
MIN_SOL="${MIN_MAINNET_SOL:-5}"
if awk "BEGIN {exit !($BAL >= $MIN_SOL)}"; then
  echo "    ⚠ Partial funding — ${BAL} SOL (min ${MIN_SOL} for program deploy)"
  export TARGET_SOL="$BAL"
  exit 0
fi

echo ""
echo "⚠ Mainnet wallet underfunded."
echo "  Bridge ${ETH:-137} ETH booty from vault $(jq -r '.vault // empty' "$MANIFEST" 2>/dev/null || echo 0xc5a47…)"
echo "  → ~${TARGET_SOL} SOL via Jupiter/Wormhole, or send ≥${MIN_SOL} SOL to $PUBKEY"
echo "  Proof ledger: /treasure/booty-manifest.json"
exit 1
