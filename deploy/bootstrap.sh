#!/usr/bin/env bash
# First-time VM setup: Docker, UFW, clone repo, build and start stack.
set -euo pipefail

LEARNSPHERE_APP_DIR="${LEARNSPHERE_APP_DIR:-/opt/learnsphere/app}"
LEARNSPHERE_ENV_DIR="${LEARNSPHERE_ENV_DIR:-/opt/learnsphere/env}"
LEARNSPHERE_REPO="${LEARNSPHERE_REPO:-https://github.com/knurdz/learn-sphere.git}"
LEARNSPHERE_BRANCH="${LEARNSPHERE_BRANCH:-main}"
LEARNSPHERE_DOMAIN="${LEARNSPHERE_DOMAIN:-learnsphere.knurdz.org}"
CADDY_EMAIL="${CADDY_EMAIL:-}"

if [[ "${EUID:-0}" -ne 0 ]]; then
  echo "Run as root: sudo bash deploy/bootstrap.sh"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    return 0
  fi
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  # shellcheck source=/dev/null
  . /etc/os-release
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    ${VERSION_CODENAME} stable" >/etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable --now docker
}

configure_ufw() {
  if ! command -v ufw >/dev/null 2>&1; then
    apt-get install -y ufw
  fi
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
}

require_env_files() {
  local missing=0
  if [[ ! -f "${LEARNSPHERE_ENV_DIR}/api.env" ]]; then
    echo "Missing ${LEARNSPHERE_ENV_DIR}/api.env"
    if [[ -f "${LEARNSPHERE_APP_DIR}/deploy/env/api.env.example" ]]; then
      echo "  cp ${LEARNSPHERE_APP_DIR}/deploy/env/api.env.example ${LEARNSPHERE_ENV_DIR}/api.env"
    fi
    missing=1
  fi
  if [[ ! -f "${LEARNSPHERE_ENV_DIR}/agent.env" ]]; then
    echo "Missing ${LEARNSPHERE_ENV_DIR}/agent.env"
    if [[ -f "${LEARNSPHERE_APP_DIR}/deploy/env/agent.env.example" ]]; then
      echo "  cp ${LEARNSPHERE_APP_DIR}/deploy/env/agent.env.example ${LEARNSPHERE_ENV_DIR}/agent.env"
    fi
    missing=1
  fi
  if [[ "${missing}" -ne 0 ]]; then
    echo ""
    echo "Create and fill both env files, then re-run bootstrap."
    exit 1
  fi
  chmod 600 "${LEARNSPHERE_ENV_DIR}/api.env" "${LEARNSPHERE_ENV_DIR}/agent.env"
}

load_compose_env() {
  if [[ -f "${LEARNSPHERE_ENV_DIR}/compose.env" ]]; then
    set -a
    # shellcheck source=/dev/null
    source "${LEARNSPHERE_ENV_DIR}/compose.env"
    set +a
  fi
  if [[ -z "${CADDY_EMAIL}" || "${CADDY_EMAIL}" == "you@example.com" ]]; then
    echo "Set a real CADDY_EMAIL in ${LEARNSPHERE_ENV_DIR}/compose.env for Let's Encrypt."
    exit 1
  fi
}

clone_or_update() {
  mkdir -p "${LEARNSPHERE_APP_DIR}" "${LEARNSPHERE_ENV_DIR}"
  if [[ ! -d "${LEARNSPHERE_APP_DIR}/.git" ]]; then
    git clone --branch "${LEARNSPHERE_BRANCH}" --depth 1 "${LEARNSPHERE_REPO}" "${LEARNSPHERE_APP_DIR}"
  else
    git -C "${LEARNSPHERE_APP_DIR}" fetch origin "${LEARNSPHERE_BRANCH}"
    git -C "${LEARNSPHERE_APP_DIR}" checkout "${LEARNSPHERE_BRANCH}"
    git -C "${LEARNSPHERE_APP_DIR}" pull --ff-only origin "${LEARNSPHERE_BRANCH}"
  fi

  local pair
  for pair in api.env:api.env.example agent.env:agent.env.example compose.env:compose.env.example; do
    local dest="${pair%%:*}"
    local example="${pair##*:}"
    if [[ ! -f "${LEARNSPHERE_ENV_DIR}/${dest}" && -f "${LEARNSPHERE_APP_DIR}/deploy/env/${example}" ]]; then
      cp "${LEARNSPHERE_APP_DIR}/deploy/env/${example}" "${LEARNSPHERE_ENV_DIR}/${dest}"
      echo "Created ${LEARNSPHERE_ENV_DIR}/${dest} from example — edit secrets, then re-run bootstrap."
    fi
  done
}

compose_up() {
  export LEARNSPHERE_ENV_DIR
  export CADDY_EMAIL
  cd "${LEARNSPHERE_APP_DIR}/deploy"
  docker compose up -d --build
  docker compose ps
}

install_docker
configure_ufw
clone_or_update
require_env_files
load_compose_env
compose_up

cat <<EOF

LearnSphere stack is up.

  API (public):  https://${LEARNSPHERE_DOMAIN}
  Set in APK / CI: API_BASE_URL=https://${LEARNSPHERE_DOMAIN}

  Env dir:       ${LEARNSPHERE_ENV_DIR}
  App dir:       ${LEARNSPHERE_APP_DIR}
  Redeploy:      sudo ${LEARNSPHERE_APP_DIR}/deploy/up.sh

Ensure DNS A record for ${LEARNSPHERE_DOMAIN} points to this server's public IP.
EOF
