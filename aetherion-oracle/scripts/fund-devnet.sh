#!/usr/bin/env bash
# Fund deploy wallet on Solana devnet — retries multiple RPC endpoints.
set -euo pipefail

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:$PATH"
PUBKEY="${1:-$(solana address)}"
TARGET_SOL="${TARGET_SOL:-3}"
LAMPORTS=$((TARGET_SOL * 1000000000))

RPCS=(
  "https://api.devnet.solana.com"
  "https://rpc.ankr.com/solana_devnet"
)

echo "==> Funding $PUBKEY to ~${TARGET_SOL} SOL on devnet"

for rpc in "${RPCS[@]}"; do
  echo "    trying $rpc"
  for attempt in 1 2 3; do
    RESULT=$(curl -sS -X POST "$rpc" \
      -H "Content-Type: application/json" \
      -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"requestAirdrop\",\"params\":[\"$PUBKEY\", $LAMPORTS]}" \
      2>/dev/null || echo '{"error":{}}')
    if echo "$RESULT" | grep -q '"result"'; then
      echo "    ✓ airdrop submitted via $rpc (attempt $attempt)"
      solana config set --url devnet
      sleep 8
      BAL=$(solana balance "$PUBKEY" 2>/dev/null | awk '{print $1}' || echo "0")
      echo "    balance: $BAL SOL"
      awk "BEGIN {exit !($BAL >= 2)}" && exit 0
    fi
    echo "    attempt $attempt failed, waiting…"
    sleep $((attempt * 5))
  done
done

# CLI fallback — smaller chunks
solana config set --url devnet
for i in 1 2 3; do
  solana airdrop 1 "$PUBKEY" 2>/dev/null && sleep 5 || true
done
BAL=$(solana balance "$PUBKEY" 2>/dev/null | awk '{print $1}' || echo "0")
echo "==> Final balance: $BAL SOL"
awk "BEGIN {exit !($BAL >= 2)}" || {
  echo "⚠ Could not fund devnet wallet — use https://faucet.solana.com or CLUSTER=localnet"
  exit 1
}
