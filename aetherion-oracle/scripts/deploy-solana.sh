#!/usr/bin/env bash
# Build and deploy fair_lattice to Solana devnet (or CLUSTER=localnet).
set -euo pipefail

CLUSTER="${CLUSTER:-devnet}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_DIR="$ROOT/solana/fair_lattice"

. /usr/local/cargo/env 2>/dev/null || true
export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:/usr/local/cargo/bin:$PATH"

cd "$PROGRAM_DIR"

echo "==> Building fair_lattice..."
anchor build

if [[ "$CLUSTER" == "localnet" ]]; then
  echo "==> Deploying to localnet (http://127.0.0.1:8899)"
  solana config set --url localhost
  if ! solana cluster-version &>/dev/null; then
    echo "Start a validator: solana-test-validator --reset --clone-feature-set --url devnet"
    exit 1
  fi
  anchor deploy --provider.cluster localnet
elif [[ "$CLUSTER" == "mainnet-beta" ]]; then
  echo "==> Deploying to mainnet-beta"
  solana config set --url mainnet-beta
  BAL=$(solana balance | awk '{print $1}')
  MIN_SOL="${MIN_MAINNET_SOL:-5}"
  PROGRAM_ID=$(solana-keygen pubkey target/deploy/fair_lattice-keypair.json 2>/dev/null || true)
  SO_SHA=$(sha256sum target/deploy/fair_lattice.so 2>/dev/null | awk '{print $1}' || true)
  DEPLOY_OUT="$ROOT/src/lib/solana/deployments/${CLUSTER}.json"
  if awk "BEGIN {exit !($BAL < $MIN_SOL)}"; then
    echo "Low mainnet balance ($BAL SOL). Need ≥${MIN_SOL} SOL — run scripts/fund-mainnet.sh"
    mkdir -p "$(dirname "$DEPLOY_OUT")"
    cat > "$DEPLOY_OUT" <<EOF
{
  "cluster": "$CLUSTER",
  "programId": "${PROGRAM_ID}",
  "rpc": "https://api.mainnet-beta.solana.com",
  "deployWallet": "$(solana address)",
  "walletBalanceSol": ${BAL},
  "minSolRequired": ${MIN_SOL},
  "programBinarySha256": "${SO_SHA}",
  "status": "built_pending_sol",
  "builtAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployedAt": null,
  "onChain": false,
  "attemptedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "blocker": "Deploy wallet has ${BAL} SOL on mainnet-beta. Need ≥${MIN_SOL} SOL. Do not invent balances.",
  "next": "Fund $(solana address) with ≥${MIN_SOL} SOL, then re-run CLUSTER=mainnet-beta ./scripts/deploy-solana.sh"
}
EOF
    cp "$DEPLOY_OUT" "$ROOT/public/solana/deployments/${CLUSTER}.json" 2>/dev/null || true
    exit 1
  fi
  anchor deploy --provider.cluster mainnet
else
  echo "==> Deploying to devnet"
  solana config set --url devnet
  BAL=$(solana balance | awk '{print $1}')
  if awk "BEGIN {exit !($BAL < 3)}"; then
    echo "Low balance ($BAL SOL). Request devnet SOL: solana airdrop 2"
    solana airdrop 2 || true
  fi
  anchor deploy --provider.cluster devnet
fi

PROGRAM_ID=$(solana-keygen pubkey target/deploy/fair_lattice-keypair.json)
DEPLOY_OUT="$ROOT/src/lib/solana/deployments/${CLUSTER}.json"
mkdir -p "$(dirname "$DEPLOY_OUT")"

cat > "$DEPLOY_OUT" <<EOF
{
  "cluster": "$CLUSTER",
  "programId": "$PROGRAM_ID",
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "rpc": "$(solana config get json_rpc_url 2>/dev/null | awk '{print $3}' || solana config get | awk '/RPC URL/ {print $3}')"
}
EOF

cp target/idl/fair_lattice.json "$ROOT/src/lib/solana/fair_lattice.json"
cp target/types/fair_lattice.ts "$ROOT/src/lib/solana/fair_lattice.ts"

bash "$ROOT/scripts/sync-solana-to-public.sh"

echo "==> Program $PROGRAM_ID"
echo "==> Wrote $DEPLOY_OUT"
