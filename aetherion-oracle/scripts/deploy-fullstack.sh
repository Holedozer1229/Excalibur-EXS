#!/usr/bin/env bash
# Build React app and deploy full stack to Vercel + Supabase (hosted Postgres).
#
# Required secrets (export or pass inline):
#   VERCEL_TOKEN          — Vercel deploy token
#   SUPABASE_ACCESS_TOKEN — Supabase personal access token
#
# Optional:
#   VERCEL_ORG_ID, VERCEL_PROJECT_ID — skip interactive link
#   SUPABASE_PROJECT_REF             — defaults to zdnulzxymjdtidlqnjoe
#   DEPLOY_BRANCH                    — Vercel production alias target (default: current branch)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"
PROJECT_REF="${SUPABASE_PROJECT_REF:-zdnulzxymjdtidlqnjoe}"
SITE_URL="${VITE_SITE_URL:-https://www.excaliburcrypto.com}"

echo "==> 1/4 Build React (Vite)"
if command -v bun >/dev/null 2>&1; then
  bun install --frozen-lockfile
  bun run build
else
  npm ci
  npm run build
fi

echo "==> 2/4 Supabase — push migrations + deploy edge functions"
if command -v supabase >/dev/null 2>&1 && [[ -n "${SUPABASE_ACCESS_TOKEN:-}" ]]; then
  supabase link --project-ref "$PROJECT_REF" --password "${SUPABASE_DB_PASSWORD:-}"
  supabase db push
  for fn in tart-claims-worker aetx-claims-worker founder-offer stripe-webhook stripe-checkout \
    payments-webhook track-funnel-event create-checkout create-portal-session; do
    if [[ -d "supabase/functions/$fn" ]]; then
      supabase functions deploy "$fn" --project-ref "$PROJECT_REF"
    fi
  done
  echo "Supabase deployed. Allowlist $SITE_URL/** in Auth redirect URLs if not already."
else
  echo "Skip Supabase CLI deploy (install supabase CLI + set SUPABASE_ACCESS_TOKEN)."
  echo "Hosted Postgres is already live at https://${PROJECT_REF}.supabase.co"
fi

echo "==> 3/4 Vercel — deploy frontend"
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  if ! command -v vercel >/dev/null 2>&1; then
    npm i -g vercel@latest
  fi
  PROD_FLAG=""
  if [[ "${VERCEL_PRODUCTION:-}" == "1" ]]; then
    PROD_FLAG="--prod"
  fi
  vercel deploy --prebuilt --token "$VERCEL_TOKEN" $PROD_FLAG \
    ${VERCEL_ORG_ID:+--scope "$VERCEL_ORG_ID"} \
    ${VERCEL_PROJECT_ID:+--project "$VERCEL_PROJECT_ID"}
else
  echo "Skip Vercel CLI (set VERCEL_TOKEN)."
  echo "Import repo at https://vercel.com — build: npm run build, output: dist"
fi

echo "==> 4/4 Post-deploy checklist"
cat <<EOF

Frontend:  $SITE_URL (Vercel)
Postgres:  https://${PROJECT_REF}.supabase.co (Supabase hosted)
zkEVM:     /bridge defaults to mainnet — zkSync Era (324) + Polygon zkEVM (1101)
           Live URUU: 0x5B6C9d85465Cc6FFe84039183872239657D90208
Env vars:  VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_PAYMENTS_CLIENT_TOKEN
DNS:       www → Vercel CNAME; apex → Vercel A/ALIAS (see vercel.json redirects)

EOF
