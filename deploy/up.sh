#!/usr/bin/env bash
# Pull latest code and rebuild containers (run on the VM after bootstrap).
set -euo pipefail

LEARNSPHERE_APP_DIR="${LEARNSPHERE_APP_DIR:-/opt/learnsphere/app}"
LEARNSPHERE_ENV_DIR="${LEARNSPHERE_ENV_DIR:-/opt/learnsphere/env}"
LEARNSPHERE_BRANCH="${LEARNSPHERE_BRANCH:-main}"
CADDY_EMAIL="${CADDY_EMAIL:-}"

if [[ ! -d "${LEARNSPHERE_APP_DIR}/.git" ]]; then
  echo "App not cloned. Run deploy/bootstrap.sh first."
  exit 1
fi

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo ${LEARNSPHERE_APP_DIR}/deploy/up.sh"
  exit 1
fi

if [[ ! -f "${LEARNSPHERE_ENV_DIR}/api.env" || ! -f "${LEARNSPHERE_ENV_DIR}/agent.env" ]]; then
  echo "Missing ${LEARNSPHERE_ENV_DIR}/api.env or agent.env"
  exit 1
fi

if [[ -f "${LEARNSPHERE_ENV_DIR}/compose.env" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "${LEARNSPHERE_ENV_DIR}/compose.env"
  set +a
fi

git -C "${LEARNSPHERE_APP_DIR}" fetch origin "${LEARNSPHERE_BRANCH}"
git -C "${LEARNSPHERE_APP_DIR}" checkout "${LEARNSPHERE_BRANCH}"
git -C "${LEARNSPHERE_APP_DIR}" pull --ff-only origin "${LEARNSPHERE_BRANCH}"

export LEARNSPHERE_ENV_DIR
export CADDY_EMAIL
cd "${LEARNSPHERE_APP_DIR}/deploy"
docker compose up -d --build
docker compose ps

echo "Redeploy complete."
