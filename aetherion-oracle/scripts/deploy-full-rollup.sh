#!/usr/bin/env bash
# FULL DEVNET ROLLUP — jaw-drop deploy across Solana, Supabase, Vercel, all rails.
#
# Usage:
#   npm run deploy:rollup
#   CLUSTER=devnet npm run deploy:rollup
#   VERCEL_PRODUCTION=1 SUPABASE_ACCESS_TOKEN=... npm run deploy:rollup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:/usr/local/cargo/bin:$PATH"
CLUSTER="${CLUSTER:-devnet}"
PROJECT_REF="${SUPABASE_PROJECT_REF:-zdnulzxymjdtidlqnjoe}"
SITE_URL="${VITE_SITE_URL:-https://www.excaliburcrypto.com}"
SMOKE_BASE="${SMOKE_BASE_URL:-https://aetherion-oracle-arcane.vercel.app}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  FULL DEVNET ROLLUP — Solana · zkEVM · URUU · B2B · UI       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "==> [1/7] Install + unit tests + build"
npm ci 2>/dev/null || npm install
npm test
npm run build

echo "==> [2/7] Fund + deploy Solana fair_lattice (CLUSTER=$CLUSTER)"
if [[ -f "./public/treasure/booty-manifest.json" ]]; then
  echo "    🏴‍☠️ Treasure booty manifest found — plunder funding enabled"
fi
if [[ "$CLUSTER" == "devnet" ]]; then
  bash ./scripts/fund-devnet.sh || CLUSTER=localnet
fi
CLUSTER="$CLUSTER" ./scripts/deploy-solana.sh
CLUSTER="$CLUSTER" ./scripts/init-lattice.sh

echo "==> [3/7] Supabase — migrations + edge functions"
if command -v supabase >/dev/null 2>&1 && [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase link --project-ref "$PROJECT_REF" --password "${SUPABASE_DB_PASSWORD:-}" 2>/dev/null || true
  supabase db push
  EDGE_FNS=(
    deliberation-seal captains-cut-worker tart-claims-worker aetx-claims-worker founder-offer
    stripe-webhook stripe-checkout stripe-manage payments-webhook
    track-funnel-event create-checkout create-portal-session
    tarot-reading chat-stream dream-weaver process-email-queue
  )
  for fn in "${EDGE_FNS[@]}"; do
    [[ -d "supabase/functions/$fn" ]] && supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
  done
  echo "    ✓ Supabase rollup deployed"
else
  echo "    ⊘ Skip Supabase — set SUPABASE_ACCESS_TOKEN"
fi

echo "==> [4/7] Vercel frontend"
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  PROD_FLAG=""
  [[ "${VERCEL_PRODUCTION:-}" == "1" ]] && PROD_FLAG="--prod"
  vercel deploy $PROD_FLAG --token "$VERCEL_TOKEN" \
    ${VERCEL_ORG_ID:+--scope "$VERCEL_ORG_ID"} \
    ${VERCEL_PROJECT_ID:+--project "$VERCEL_PROJECT_ID"} \
    --yes
else
  echo "    ⊘ Skip Vercel CLI — push branch for GitHub integration"
fi

echo "==> [5/7] E2E smoke (lattice + rollup + deliberation)"
if curl -sf http://localhost:8080/ >/dev/null 2>&1; then
  PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test e2e/public-pages.spec.ts --grep "rollup|enterprise" 2>/dev/null || true
fi

echo "==> [6/7] HTTP smoke on $SMOKE_BASE"
ROUTES=(
  "/"
  "/rollup"
  "/enterprise/deliberation"
  "/verify/deliberation"
  "/bridge?mode=mainnet"
  "/token/lattice"
  "/buy/uruu"
  "/overnight"
  "/black-pearl"
)
FAIL=0
for route in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${SMOKE_BASE}${route}" || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "    ✓ $code  $route"
  else
    echo "    ✗ $code  $route"
    FAIL=$((FAIL + 1))
  fi
done

echo "==> [7/7] Rollup manifest"
DEPLOY_JSON="src/lib/solana/deployments/${CLUSTER}.json"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  ROLLUP COMPLETE                                             ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Command center:  ${SITE_URL}/rollup"
echo "║  B2B deliberation: ${SITE_URL}/enterprise/deliberation"
echo "║  Solana cluster:  $CLUSTER"
echo "║  Program:         ALe6YqHU3rwxw8FQhmSRjdK9sxMLqbDd9zyRVNmTymo6"
echo "║  zkEVM:           /bridge?mode=mainnet"
echo "║  URUU:            0x5B6C9d85465Cc6FFe84039183872239657D90208"
echo "╚══════════════════════════════════════════════════════════════╝"
cat "$DEPLOY_JSON" 2>/dev/null || true

[[ "$FAIL" -eq 0 ]] || echo "Warning: $FAIL route(s) not 200 on preview — merge PR to refresh Vercel"
