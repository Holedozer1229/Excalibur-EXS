#!/usr/bin/env bash
# Inject 137 ETH booty on Ethereum mainnet — provenance trace + bridge deploy + claim.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Compile SphinxBootyBridge"
mkdir -p build/contracts
npx --yes solc@0.8.20 --bin --abi contracts/SphinxBootyBridge.sol -o build/contracts 2>/dev/null || true

echo "==> Run inject pipeline"
npx --yes tsx "$ROOT/scripts/inject-booty-mainnet.mjs"
