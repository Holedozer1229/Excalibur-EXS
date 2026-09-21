#!/usr/bin/env bash
# Full mainnet operator path — fail-closed dry-run (npm run mainnet).
# BROADCAST=1 to attempt live txs. Never invents 137 ETH.
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
export ETHEREUM_RPC="${ETHEREUM_RPC:-https://ethereum.publicnode.com}"
npx --yes tsx "$ROOT/scripts/mainnet-operator.mjs"
