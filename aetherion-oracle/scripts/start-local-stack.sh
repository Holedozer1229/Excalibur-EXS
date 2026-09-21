#!/usr/bin/env bash
# Start local full stack: Postgres (Docker) + Vite React dev server.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export PATH="${BUN_INSTALL:-$HOME/.bun}/bin:$PATH"

start_postgres() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker not found — skipping local Postgres."
    echo "Production uses hosted Supabase: ${VITE_SUPABASE_URL:-https://zdnulzxymjdtidlqnjoe.supabase.co}"
    return 0
  fi
  if docker compose ps postgres 2>/dev/null | grep -q "running"; then
    echo "Postgres already running on :5432"
    return 0
  fi
  echo "Starting Postgres via docker compose…"
  docker compose up -d postgres
  echo "Postgres ready at postgres://postgres:postgres@localhost:5432/aetherion"
}

start_react() {
  if command -v bun >/dev/null 2>&1; then
    exec bun run dev -- --host 0.0.0.0 --port 8080
  fi
  exec npm run dev -- --host 0.0.0.0 --port 8080
}

case "${1:-all}" in
  postgres) start_postgres ;;
  react) start_react ;;
  all)
    start_postgres
    start_react
    ;;
  *)
    echo "Usage: $0 [postgres|react|all]"
    exit 1
    ;;
esac
