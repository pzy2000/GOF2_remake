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

echo "Starting GOF2 frontend and authoritative economy backend..."
echo "Economy backend: http://127.0.0.1:19777"
echo "Frontend: Vite will print the local URL below."
exec npm run dev:full
