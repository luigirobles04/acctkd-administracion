#!/usr/bin/env bash
# Arranca Next.js con Node de nvm (macOS sin node en PATH).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$NVM_DIR/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  . "$NVM_DIR/nvm.sh"
fi
if ! command -v node >/dev/null 2>&1; then
  export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
fi
cd "$ROOT"
exec npm run dev
