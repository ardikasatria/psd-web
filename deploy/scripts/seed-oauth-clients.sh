#!/usr/bin/env bash
# Daftarkan klien OAuth internal (Gitea, JupyterHub, Superset). Idempotent — skip bila sudah ada.
# Secret klien baru dicetak sekali ke stdout; salin ke pengelola rahasia.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="${1:-docker-compose.prod.yml}"
ENV_FILE="${2:-}"

compose() {
  if [[ -n "${ENV_FILE}" ]]; then
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
  else
    docker compose -f "${COMPOSE_FILE}" "$@"
  fi
}

echo "==> Seed klien OAuth internal (Langkah 48)"
compose exec -T backend python -m app.oauth.seed_clients
