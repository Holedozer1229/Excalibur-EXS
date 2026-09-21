#!/usr/bin/env bash
# Verify www.excaliburcrypto.com serves the Aetherion SPA (not the legacy Excalibur static site).
set -euo pipefail

DOMAIN="${SMOKE_CUSTOM_DOMAIN:-https://www.excaliburcrypto.com}"
FAIL=0

check_route() {
  local route="$1"
  local expect="${2:-}"
  local url="${DOMAIN}${route}"
  local code body
  code=$(curl -sL -o /tmp/custom-domain-body.txt -w "%{http_code}" "$url" || echo "000")
  body=$(cat /tmp/custom-domain-body.txt 2>/dev/null || true)

  if [[ "$code" != "200" ]]; then
    echo "    ✗ $code  $route (expected 200)"
    FAIL=$((FAIL + 1))
    return
  fi

  if [[ -n "$expect" ]] && ! grep -q "$expect" <<<"$body"; then
    echo "    ✗ $code  $route (missing expected content: $expect)"
    FAIL=$((FAIL + 1))
    return
  fi

  echo "    ✓ $code  $route"
}

echo "==> Custom domain smoke: $DOMAIN"

home=$(curl -s "$DOMAIN/" || true)
if grep -q 'website/index.html' <<<"$home" || grep -q 'Prophetic Forge of Digital Steel' <<<"$home"; then
  echo "    ✗ Homepage serves legacy Excalibur static site (wrong Vercel project)"
  echo "      Fix: Vercel → aetherion-oracle-arcane → Settings → Domains"
  echo "      Add www.excaliburcrypto.com + excaliburcrypto.com; remove from old EXS project."
  FAIL=$((FAIL + 1))
elif grep -q 'Verifiable AI Artifacts' <<<"$home" || grep -q 'id=\"root\"' <<<"$home"; then
  echo "    ✓ Homepage serves Aetherion SPA"
else
  echo "    ? Homepage body unrecognized — manual check recommended"
fi

check_route "/chipset" 'id="root"'
check_route "/chipset/pitch-deck.html" "AQAI"
check_route "/chipset/aqai-chip-hero.png" ""

exit "$FAIL"
