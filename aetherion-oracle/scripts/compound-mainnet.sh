#!/usr/bin/env bash
# Self-compound + fail-closed live CREATE2 dock.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Compound unit tests"
npm test -- src/lib/selfCompound.test.ts

echo ""
echo "==> Compound helm"
npx --yes tsx "$ROOT/scripts/compound-mainnet.mjs" "$@"
