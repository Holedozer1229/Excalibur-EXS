#!/usr/bin/env bash
# Day-zero helm: profit/keel check → optional zkSync withdraw → CREATE2 empty dock.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Day-zero unit tests"
npm test -- src/lib/dayZeroSail.test.ts

echo ""
echo "==> Day-zero helm (dry-run unless DAYZERO_LIVE=1)"
npx --yes tsx "$ROOT/scripts/day-zero-sail.mjs" "$@"
