#!/usr/bin/env bash
# Forward the host API port into a USB-connected Android device so
# API_BASE_URL=http://127.0.0.1:3000 works on a physical phone.
set -euo pipefail

PORT="${API_PORT:-3000}"

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found. Install Android platform-tools, then re-run." >&2
  exit 1
fi

devices="$(adb devices | awk 'NR>1 && $2=="device" { print $1 }')"
if [[ -z "$devices" ]]; then
  echo "No authorized Android device. Plug in USB, enable USB debugging, accept the prompt, then run: adb devices" >&2
  exit 1
fi

target=""
while IFS= read -r serial; do
  [[ -z "$serial" ]] && continue
  # Prefer a real phone when an emulator is also attached.
  case "$serial" in
    emulator-*) continue ;;
  esac
  target="$serial"
  break
done <<< "$devices"

if [[ -z "$target" ]]; then
  target="$(printf '%s\n' "$devices" | head -n 1)"
fi

adb -s "$target" reverse "tcp:${PORT}" "tcp:${PORT}" >/dev/null
echo "API tunnel ready: device $target → 127.0.0.1:${PORT}"
