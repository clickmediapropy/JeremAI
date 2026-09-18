#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -f pnpm-lock.yaml ]] && command -v pnpm >/dev/null; then
  exec pnpm demo
fi
exec npm run demo
