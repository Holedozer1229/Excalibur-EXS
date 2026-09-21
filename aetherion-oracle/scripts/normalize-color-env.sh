#!/usr/bin/env bash
# Run a command with normalized terminal color env (fixes NO_COLOR vs FORCE_COLOR conflict).
if [[ -n "${NO_COLOR:-}" ]]; then
  exec env -u FORCE_COLOR "$@"
else
  exec "$@"
fi
