#!/usr/bin/env bash
# 24/7 MAINNET vacuum watch — leftover refunds, L2 bridges, allowances,
# forgotten test sends, Solana rent. Documented wallets only.
#
# Default: dry-run daemon loop every VACUUM_INTERVAL_MS (300000 = 5 min).
# Single scan:  ./scripts/vacuum-dust-fees.sh --once
# Live txs:     VACUUM_LIVE=1 ./scripts/vacuum-dust-fees.sh
# Revokes:      VACUUM_LIVE=1 VACUUM_REVOKE=1 ./scripts/vacuum-dust-fees.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="${HOME}/.local/share/solana/install/active_release/bin:${PATH:-}"
export ETHEREUM_RPC="${ETHEREUM_RPC:-https://ethereum.publicnode.com}"
export VACUUM_INTERVAL_MS="${VACUUM_INTERVAL_MS:-300000}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  24/7 MAINNET VACUUM WATCH                                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "RPC:       ${ETHEREUM_RPC}"
echo "Interval:  ${VACUUM_INTERVAL_MS} ms"
echo "Live:      ${VACUUM_LIVE:-0}   revoke: ${VACUUM_REVOKE:-0}"
echo ""

if [[ "${VACUUM_SKIP_TESTS:-0}" != "1" ]]; then
  echo "==> [1/2] Unit tests (vacuumWatch)"
  npm test -- src/lib/vacuumWatch.test.ts
  echo ""
fi

echo "==> [2/2] Watch daemon (dry-run unless VACUUM_LIVE=1)"
exec npx --yes tsx "$ROOT/scripts/vacuum-dust-daemon.mjs" "$@"
