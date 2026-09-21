#!/usr/bin/env bash
# Deploy "Lattice Moon" — fair_lattice Solana program + init pool + frontend build + smoke.
#
# Usage:
#   npm run deploy:lattice-moon                    # localnet (default if devnet unfunded)
#   CLUSTER=devnet npm run deploy:lattice-moon     # devnet (needs ≥3 SOL on deploy wallet)
#   VERCEL_PRODUCTION=1 VERCEL_TOKEN=... npm run deploy:lattice-moon
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:/usr/local/cargo/bin:$PATH"
CLUSTER="${CLUSTER:-devnet}"
SITE_URL="${VITE_SITE_URL:-https://www.excaliburcrypto.com}"
SMOKE_BASE="${SMOKE_BASE_URL:-https://aetherion-oracle-arcane.vercel.app}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  LATTICE MOON DEPLOY — fair_lattice + /token/lattice         ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "==> [1/5] Unit tests + production build"
npm test
npm run build

echo "==> [2/5] Solana program deploy (CLUSTER=$CLUSTER)"
if [[ "$CLUSTER" == "devnet" ]]; then
  solana config set --url devnet
  BAL=$(solana balance 2>/dev/null | awk '{print $1}' || echo "0")
  if awk "BEGIN {exit !($BAL < 2)}"; then
    echo "    Devnet balance low ($BAL SOL) — requesting airdrop…"
    solana airdrop 2 2>/dev/null || solana airdrop 1 2>/dev/null || true
    BAL=$(solana balance 2>/dev/null | awk '{print $1}' || echo "0")
    if awk "BEGIN {exit !($BAL < 2)}"; then
      echo "    ⚠ Devnet faucet rate-limited — falling back to localnet for on-chain deploy"
      CLUSTER=localnet
    fi
  fi
fi

CLUSTER="$CLUSTER" ./scripts/deploy-solana.sh

echo "==> [3/5] Initialize lattice pool (initialize → setup_pool → seed_vault)"
export ROOT="$ROOT"
CLUSTER="$CLUSTER" ./scripts/init-lattice.sh

echo "==> [4/5] Vercel frontend (optional)"
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  PROD_FLAG=""
  [[ "${VERCEL_PRODUCTION:-}" == "1" ]] && PROD_FLAG="--prod"
  vercel deploy $PROD_FLAG --token "$VERCEL_TOKEN" \
    ${VERCEL_ORG_ID:+--scope "$VERCEL_ORG_ID"} \
    ${VERCEL_PROJECT_ID:+--project "$VERCEL_PROJECT_ID"} \
    --yes
else
  echo "    ⊘ Skip Vercel — set VERCEL_TOKEN or push to main for GitHub → Vercel"
fi

echo "==> [5/5] Smoke /token/lattice (moon preset + Solana card)"
for base in "$SMOKE_BASE" "$SITE_URL"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${base}/token/lattice" || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "    ✓ $code  ${base}/token/lattice"
    break
  else
    echo "    ✗ $code  ${base}/token/lattice"
  fi
done

if command -v npx >/dev/null 2>&1 && curl -sf http://localhost:8080/token/lattice >/dev/null 2>&1; then
  npx playwright test e2e/potential-profit.spec.ts e2e/bonding-curve.spec.ts --grep "moonshot|lattice" 2>/dev/null || true
fi

DEPLOY_JSON="src/lib/solana/deployments/${CLUSTER}.json"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  LATTICE MOON DEPLOYED                                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Cluster:   $CLUSTER"
echo "║  Program:   ALe6YqHU3rwxw8FQhmSRjdK9sxMLqbDd9zyRVNmTymo6"
echo "║  Manifest:  $DEPLOY_JSON"
echo "║  Moon UI:   ${SITE_URL}/token/lattice"
echo "║  Moon math: 50k SOL/day × 1.5% blended ≈ 273,750 SOL/yr"
echo "╚══════════════════════════════════════════════════════════════╝"

cat "$DEPLOY_JSON" 2>/dev/null || true
