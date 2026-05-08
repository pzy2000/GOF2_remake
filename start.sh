#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required to start GOF2." >&2
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "node_modules not found; installing dependencies..."
  npm install
fi

export GOF2_FRONTEND_HOST="${GOF2_FRONTEND_HOST:-0.0.0.0}"
export GOF2_ECONOMY_HOST="${GOF2_ECONOMY_HOST:-0.0.0.0}"
export GOF2_ECONOMY_PORT="${GOF2_ECONOMY_PORT:-19777}"

echo "Starting GOF2 frontend and authoritative economy backend..."
echo "Economy backend: http://${GOF2_ECONOMY_HOST}:${GOF2_ECONOMY_PORT}"
echo "Frontend: Vite will print the local and network URLs below."
exec npm run dev:full
