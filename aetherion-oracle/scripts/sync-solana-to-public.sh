#!/usr/bin/env bash
# Sync fair_lattice artifacts into public/solana/ so the React server (Vite/Vercel) hosts them.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC_SOL="$ROOT/public/solana"
DEPLOYMENTS_SRC="$ROOT/src/lib/solana/deployments"
IDL_SRC="$ROOT/src/lib/solana/fair_lattice.json"
PROGRAM_SO="$ROOT/solana/fair_lattice/target/deploy/fair_lattice.so"
DEFAULT_CLUSTER="${SOLANA_DEFAULT_CLUSTER:-mainnet-beta}"

mkdir -p "$PUBLIC_SOL/deployments"

if [[ -f "$IDL_SRC" ]]; then
  cp "$IDL_SRC" "$PUBLIC_SOL/fair_lattice.json"
  echo "==> IDL → public/solana/fair_lattice.json"
else
  echo "⚠ Missing $IDL_SRC — run npm run solana:build first"
fi

if [[ -d "$DEPLOYMENTS_SRC" ]]; then
  cp "$DEPLOYMENTS_SRC"/*.json "$PUBLIC_SOL/deployments/" 2>/dev/null || true
  echo "==> deployments → public/solana/deployments/"
fi

if [[ -f "$PROGRAM_SO" ]]; then
  cp "$PROGRAM_SO" "$PUBLIC_SOL/fair_lattice.so"
  SO_HASH=$(sha256sum "$PROGRAM_SO" | awk '{print $1}')
  echo "==> program binary → public/solana/fair_lattice.so ($SO_HASH)"
else
  SO_HASH=""
fi

PROGRAM_ID="ALe6YqHU3rwxw8FQhmSRjdK9sxMLqbDd9zyRVNmTymo6"
ACTIVE_CLUSTER="$DEFAULT_CLUSTER"
LATTICE=""
MINT=""
RPC="https://api.mainnet-beta.solana.com"

read_deploy() {
  local file="$1"
  local cluster="$2"
  if [[ -f "$file" ]]; then
  ACTIVE_CLUSTER=$(jq -r '.cluster // "'"$cluster"'"' "$file" 2>/dev/null || echo "$cluster")
  PROGRAM_ID=$(jq -r '.programId // empty' "$file" 2>/dev/null || echo "$PROGRAM_ID")
  LATTICE=$(jq -r '.lattice // empty' "$file" 2>/dev/null || true)
  MINT=$(jq -r '.mint // empty' "$file" 2>/dev/null || true)
  RPC=$(jq -r '.rpc // empty' "$file" 2>/dev/null || echo "$RPC")
  fi
}

# Prefer mainnet-beta when initialized, else devnet, else localnet
if [[ -f "$DEPLOYMENTS_SRC/mainnet-beta.json" ]] && [[ -n "$(jq -r '.lattice // empty' "$DEPLOYMENTS_SRC/mainnet-beta.json" 2>/dev/null)" ]]; then
  read_deploy "$DEPLOYMENTS_SRC/mainnet-beta.json" "mainnet-beta"
elif [[ -f "$DEPLOYMENTS_SRC/devnet.json" ]]; then
  read_deploy "$DEPLOYMENTS_SRC/devnet.json" "devnet"
  RPC="https://api.devnet.solana.com"
elif [[ -f "$DEPLOYMENTS_SRC/localnet.json" ]]; then
  read_deploy "$DEPLOYMENTS_SRC/localnet.json" "localnet"
  RPC="http://127.0.0.1:8899"
fi

MAINNET_ID=$(jq -r '.programId // "'"$PROGRAM_ID"'"' "$DEPLOYMENTS_SRC/mainnet-beta.json" 2>/dev/null || echo "$PROGRAM_ID")
DEVNET_ID=$(jq -r '.programId // "'"$PROGRAM_ID"'"' "$DEPLOYMENTS_SRC/devnet.json" 2>/dev/null || echo "$PROGRAM_ID")
LOCAL_ID=$(jq -r '.programId // "'"$PROGRAM_ID"'"' "$DEPLOYMENTS_SRC/localnet.json" 2>/dev/null || echo "$PROGRAM_ID")

cat > "$PUBLIC_SOL/manifest.json" <<EOF
{
  "name": "fair_lattice",
  "description": "Fair lattice bonding curve + referral attributes — hosted by Aetherion React server",
  "version": "0.1.0",
  "hosted": true,
  "generatedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "idl": "/solana/fair_lattice.json",
  "programBinary": "/solana/fair_lattice.so",
  "programBinarySha256": "${SO_HASH}",
  "defaultCluster": "${DEFAULT_CLUSTER}",
  "clusters": {
    "mainnet-beta": {
      "programId": "${MAINNET_ID}",
      "rpc": "https://api.mainnet-beta.solana.com",
      "deployment": "/solana/deployments/mainnet-beta.json"
    },
    "devnet": {
      "programId": "${DEVNET_ID}",
      "rpc": "https://api.devnet.solana.com",
      "deployment": "/solana/deployments/devnet.json"
    },
    "localnet": {
      "programId": "${LOCAL_ID}",
      "rpc": "http://127.0.0.1:8899",
      "deployment": "/solana/deployments/localnet.json"
    }
  },
  "active": {
    "cluster": "${ACTIVE_CLUSTER}",
    "programId": "${PROGRAM_ID}",
    "rpc": "${RPC}",
    "lattice": "${LATTICE}",
    "mint": "${MINT}"
  }
}
EOF

echo "==> manifest → public/solana/manifest.json (default: ${DEFAULT_CLUSTER}, active: ${ACTIVE_CLUSTER})"
echo "    Hosted at /solana/* when React server runs (vite preview / Vercel)"
