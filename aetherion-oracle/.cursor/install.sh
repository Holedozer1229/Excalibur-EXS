#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for the Aetherion Oracle Vite/React app.
# Runs after the repository is checked out. Must terminate successfully and be
# safe to run repeatedly (including on top of a warm snapshot).
set -euo pipefail

# The repository's authoritative lockfile is bun.lockb (see README), so the
# environment standardises on bun. Install it if the base image lacks it.
if ! command -v bun >/dev/null 2>&1; then
  export BUN_INSTALL="$HOME/.bun"
  curl -fsSL https://bun.sh/install | bash
fi
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

# Node warns when NO_COLOR and FORCE_COLOR are both set — prefer NO_COLOR in CI shells.
if [[ -n "${NO_COLOR:-}" ]]; then
  unset FORCE_COLOR
fi

# Expose bun on the global PATH so start/terminals commands find it too.
if command -v sudo >/dev/null 2>&1; then
  sudo ln -sf "$BUN_INSTALL/bin/bun" /usr/local/bin/bun 2>/dev/null || true
  sudo ln -sf "$BUN_INSTALL/bin/bunx" /usr/local/bin/bunx 2>/dev/null || true
fi

# Install JS dependencies exactly as pinned by the committed lockfile.
bun install --frozen-lockfile

# Best-effort: install the Chromium build the Playwright e2e suite uses. This
# is not required for the core dev flow, so a failure here must not break setup.
if bunx playwright install --with-deps chromium; then
  :
else
  bunx playwright install chromium || echo "playwright chromium unavailable; e2e will be skipped"
fi
