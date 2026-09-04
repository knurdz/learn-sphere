#!/usr/bin/env bash
# Run the Flutter app on a USB Android device with the local API tunnel set up.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

"$ROOT/scripts/ensure_android_api_tunnel.sh"

if ! curl -sf "http://127.0.0.1:${API_PORT:-3000}/" >/dev/null 2>&1 \
  && ! curl -sf "http://127.0.0.1:${API_PORT:-3000}/api/health" >/dev/null 2>&1; then
  echo "Local API does not look like it is running on port ${API_PORT:-3000}." >&2
  echo "In another terminal: cd api && pnpm dev" >&2
  exit 1
fi

exec flutter run "$@"
