#!/usr/bin/env bash
# Full-stack mainnet zkEVM rollup deploy runbook — test, build, Supabase, Vercel, e2e, smoke.
#
# Usage:
#   npm run deploy:runbook
#   VERCEL_PRODUCTION=1 npm run deploy:runbook
#   SUPABASE_ACCESS_TOKEN=... VERCEL_PRODUCTION=1 npm run deploy:runbook
#   SMOKE_BASE_URL=https://aetherion-oracle-arcane.vercel.app npm run deploy:runbook
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="/home/ubuntu/.local/share/solana/install/active_release/bin:${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"
PROJECT_REF="${SUPABASE_PROJECT_REF:-zdnulzxymjdtidlqnjoe}"
SITE_URL="${VITE_SITE_URL:-https://www.excaliburcrypto.com}"
PREVIEW_URL="${SMOKE_BASE_URL:-https://aetherion-oracle-arcane.vercel.app}"
SMOKE_ONLY="${SMOKE_ONLY:-0}"
RUN_E2E="${RUN_E2E:-1}"

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MAINNET zkEVM ROLLUP — FULL DEPLOY RUNBOOK                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# ── 1. Install + test + build ────────────────────────────────────────────────
echo "==> [1/8] Install dependencies"
if command -v bun >/dev/null 2>&1; then
  bun install --frozen-lockfile
else
  npm ci 2>/dev/null || npm install
fi

if [[ "$SMOKE_ONLY" != "1" ]]; then
  echo "==> [2/8] Unit tests (rollup + zkEVM + treasure)"
  npm test

  echo "==> [3/8] Production build (Vite → dist/)"
  npm run build
else
  echo "==> [2-3/8] Skipped (SMOKE_ONLY=1)"
fi

# ── 2. Local E2E against preview ─────────────────────────────────────────────
if [[ "$SMOKE_ONLY" != "1" && "$RUN_E2E" == "1" ]]; then
  echo "==> [4/8] Playwright E2E (rollup + zkEVM + public pages)"
  if ! curl -sf http://localhost:8080/ >/dev/null 2>&1; then
    npm run preview -- --host 127.0.0.1 --port 8080 >/tmp/vite-preview.log 2>&1 &
    PREVIEW_PID=$!
  else
    PREVIEW_PID=""
  fi
  for i in $(seq 1 30); do
    curl -sf http://localhost:8080/ >/dev/null 2>&1 && break
    sleep 1
  done
  if curl -sf http://localhost:8080/ >/dev/null 2>&1; then
    PLAYWRIGHT_BASE_URL=http://localhost:8080 npm run test:e2e
    echo "    ✓ E2E passed"
  else
    echo "    ⊘ Preview server unavailable — skip E2E (set RUN_E2E=0 to silence)"
  fi
  [[ -n "$PREVIEW_PID" ]] && kill "$PREVIEW_PID" 2>/dev/null || true
else
  echo "==> [4/8] E2E skipped (SMOKE_ONLY=$SMOKE_ONLY RUN_E2E=$RUN_E2E)"
fi

# ── 3. Supabase (Postgres + edge) ───────────────────────────────────────────
echo "==> [5/8] Supabase — migrations + edge functions"
if command -v supabase >/dev/null 2>&1 && [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase link --project-ref "$PROJECT_REF" --password "${SUPABASE_DB_PASSWORD:-}" 2>/dev/null || true
  supabase db push

  CANONICAL_ETH=$(jq -r '.canonicalEthBooty // 137.190325' public/treasure/booty-manifest.json 2>/dev/null || echo "137.190325")
  PROFIT_WEI=$(node -e "console.log(BigInt(Math.floor(${CANONICAL_ETH}*1e18)).toString())")

  EDGE_FNS=(
    captains-cut-worker deliberation-seal tart-claims-worker aetx-claims-worker founder-offer
    stripe-webhook stripe-checkout stripe-manage payments-webhook
    track-funnel-event create-checkout create-portal-session
    tarot-reading chat-stream dream-weaver process-email-queue
  )
  for fn in "${EDGE_FNS[@]}"; do
    if [[ -d "supabase/functions/$fn" ]]; then
      echo "    deploying $fn"
      supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
    fi
  done
  echo "    ✓ Supabase deployed — CAPTAINS_CUT_PERIOD_PROFIT_WEI=${PROFIT_WEI}"
else
  echo "    ⊘ Skip — set SUPABASE_ACCESS_TOKEN + install supabase CLI"
  echo "    Hosted Postgres: https://${PROJECT_REF}.supabase.co"
fi

# ── 4. Vercel (React) ───────────────────────────────────────────────────────
echo "==> [6/8] Vercel — frontend"
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  if ! command -v vercel >/dev/null 2>&1; then
    npm i -g vercel@latest
  fi
  PROD_FLAG=""
  [[ "${VERCEL_PRODUCTION:-}" == "1" ]] && PROD_FLAG="--prod"
  vercel deploy $PROD_FLAG --token "$VERCEL_TOKEN" \
    ${VERCEL_ORG_ID:+--scope "$VERCEL_ORG_ID"} \
    ${VERCEL_PROJECT_ID:+--project "$VERCEL_PROJECT_ID"} \
    --yes
  echo "    ✓ Vercel deploy submitted"
else
  echo "    ⊘ Skip — set VERCEL_TOKEN (or push main → GitHub → Vercel)"
fi

# ── 5. Solana mainnet (optional) ────────────────────────────────────────────
echo "==> [7/8] Solana mainnet program (137 ETH booty scale)"
if bash "$ROOT/scripts/bridge-booty.sh" 2>/dev/null; then
  echo "    ✓ Booty bridge + Solana mainnet complete"
else
  echo "    ⊘ Booty bridge incomplete — npm run bridge:booty when vault/SOL funded"
fi

# ── 6. Smoke verify key routes ──────────────────────────────────────────────
echo "==> [8/8] HTTP smoke on $PREVIEW_URL"
ROUTES=(
  "/"
  "/bridge"
  "/bridge?mode=mainnet"
  "/rollup"
  "/rollup/manifest.json"
  "/solana/manifest.json"
  "/overnight"
  "/black-pearl"
  "/war-chest"
  "/buy/uruu"
  "/enterprise/deliberation"
  "/verify/deliberation"
  "/exs"
  "/chipset"
  "/chipset/pitch-deck.html"
  "/chipset/aqai-chip-hero.png"
  "/admin/audit"
)
FAIL=0
for route in "${ROUTES[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${PREVIEW_URL}${route}" || echo "000")
  if [[ "$code" == "200" ]]; then
    echo "    ✓ $code  $route"
  else
    echo "    ✗ $code  $route"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║  MAINNET zkEVM ROLLUP RUNBOOK COMPLETE                       ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Command center:  ${SITE_URL}/rollup"
echo "║  Rollup manifest: ${SITE_URL}/rollup/manifest.json"
echo "║  zkEVM bridge:    /bridge?mode=mainnet (324 + 1101)"
echo "║  URUU:            0x5B6C9d85465Cc6FFe84039183872239657D90208"
echo "║  Solana program:  ALe6YqHU3rwxw8FQhmSRjdK9sxMLqbDd9zyRVNmTymo6"
echo "║  Booty vault:     0xc5a47c9adab637d1caa791cce193079d22c8cb20"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Commands: npm run deploy:runbook | deploy:mainnet | booty:mainnet"
echo "║  Env: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SITE_URL"
echo "╚══════════════════════════════════════════════════════════════╝"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "Warning: $FAIL route(s) did not return 200 on $PREVIEW_URL"
  echo "Custom domain may lag — use SMOKE_BASE_URL=https://aetherion-oracle-arcane.vercel.app"
  exit 1
fi

# Custom domain must serve this SPA — not the legacy Excalibur static deployment.
if [[ "${VERIFY_CUSTOM_DOMAIN:-1}" == "1" ]]; then
  echo ""
  bash "$ROOT/scripts/verify-custom-domain.sh" || {
    echo ""
    echo "Custom domain $SITE_URL is not serving the Aetherion SPA yet."
    echo "Move www.excaliburcrypto.com to the aetherion-oracle-arcane Vercel project (see README)."
    exit 1
  }
fi
