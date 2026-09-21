#!/usr/bin/env bash
# Full-scale mainnet production deploy — 137 ETH booty → Solana mainnet + Vercel prod + Supabase.
#
# Usage:
#   npm run deploy:mainnet
#   VERCEL_PRODUCTION=1 SUPABASE_ACCESS_TOKEN=... npm run deploy:mainnet
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:/usr/local/cargo/bin:$PATH"
CLUSTER="mainnet-beta"
PROJECT_REF="${SUPABASE_PROJECT_REF:-zdnulzxymjdtidlqnjoe}"
SITE_URL="${VITE_SITE_URL:-https://www.excaliburcrypto.com}"
SMOKE_BASE="${SMOKE_BASE_URL:-$SITE_URL}"
MANIFEST="$ROOT/public/treasure/booty-manifest.json"
CANONICAL_ETH=$(jq -r '.canonicalEthBooty // 137.190325' "$MANIFEST" 2>/dev/null || echo "137.190325")

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MAINNET PRODUCTION — ${CANONICAL_ETH} ETH booty · fair_lattice · prod   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

echo "==> [1/8] Install + unit tests"
npm ci 2>/dev/null || npm install
npm test

echo "==> [2/8] Treasure ledger — full booty SOL budget"
node -e "
const m=require('./public/treasure/booty-manifest.json');
const sol=Math.floor((m.canonicalEthBooty*m.ethUsdOracle)/m.solUsdOracle);
console.log('    Canonical:', m.canonicalEthBooty, 'ETH →', sol.toLocaleString(), 'SOL @ oracle');
"

echo "==> [3/8] Fund check + deploy Solana fair_lattice (mainnet-beta)"
SOLANA_DEPLOYED=""
if bash "$ROOT/scripts/fund-mainnet.sh"; then
  CLUSTER=mainnet-beta bash "$ROOT/scripts/deploy-solana.sh"
  CLUSTER=mainnet-beta bash "$ROOT/scripts/init-lattice.sh"
  SOLANA_DEPLOYED=1
  echo "    ✓ Solana mainnet program live"
else
  echo "    ⊘ Solana mainnet skipped — fund wallet (see fund-mainnet.sh)"
  echo "    Building artifacts for hosted /solana/* anyway"
  npm run solana:build 2>/dev/null || true
fi

echo "==> [4/8] Production build"
npm run build

echo "==> [5/8] Supabase — migrations + edge functions (captain's cut @ 137 ETH)"
if command -v supabase >/dev/null 2>&1 && [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase link --project-ref "$PROJECT_REF" --password "${SUPABASE_DB_PASSWORD:-}" 2>/dev/null || true
  supabase db push
  PROFIT_WEI=$(node -e "console.log(BigInt(Math.floor(${CANONICAL_ETH}*1e18)).toString())")
  echo "    CAPTAINS_CUT_PERIOD_PROFIT_WEI=${PROFIT_WEI}"
  EDGE_FNS=(
    captains-cut-worker deliberation-seal tart-claims-worker aetx-claims-worker founder-offer
    stripe-webhook stripe-checkout stripe-manage payments-webhook
    track-funnel-event create-checkout create-portal-session
    tarot-reading chat-stream dream-weaver process-email-queue
  )
  for fn in "${EDGE_FNS[@]}"; do
    [[ -d "supabase/functions/$fn" ]] && supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
  done
  echo "    ✓ Supabase deployed — set secrets: CAPTAINS_CUT_PERIOD_PROFIT_WEI=${PROFIT_WEI}"
else
  echo "    ⊘ Skip Supabase — set SUPABASE_ACCESS_TOKEN"
fi

echo "==> [6/8] Vercel production frontend"
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  PROD_FLAG="--prod"
  vercel deploy $PROD_FLAG --token "$VERCEL_TOKEN" \
    ${VERCEL_ORG_ID:+--scope "$VERCEL_ORG_ID"} \
    ${VERCEL_PROJECT_ID:+--project "$VERCEL_PROJECT_ID"} \
    --yes
  echo "    ✓ Vercel production deploy submitted"
else
  echo "    ⊘ Skip Vercel CLI — push main or set VERCEL_TOKEN"
fi

echo "==> [7/8] HTTP smoke on $SMOKE_BASE"
ROUTES=(
  "/"
  "/rollup"
  "/black-pearl"
  "/black-pearl#captains-cut"
  "/enterprise/deliberation"
  "/bridge?mode=mainnet"
  "/buy/uruu"
  "/solana/manifest.json"
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

echo "==> [8/8] Manifest"
DEPLOY_JSON="src/lib/solana/deployments/mainnet-beta.json"
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MAINNET PRODUCTION COMPLETE                                 ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Site:            ${SITE_URL}"
echo "║  Booty:            ${CANONICAL_ETH} ETH → Solana mainnet"
echo "║  Solana:           $([[ "$SOLANA_DEPLOYED" == "1" ]] && echo live || echo pending wallet fund)"
echo "║  Captain's cut:    3.33% of ${CANONICAL_ETH} ETH (~\$119/drip avg)"
echo "║  URUU:             0x5B6C9d85465Cc6FFe84039183872239657D90208"
echo "╚══════════════════════════════════════════════════════════════╝"
[[ -f "$DEPLOY_JSON" ]] && cat "$DEPLOY_JSON" || true

[[ "$FAIL" -eq 0 ]] || echo "Warning: $FAIL route(s) not 200 — merge PR #14 to refresh production"
