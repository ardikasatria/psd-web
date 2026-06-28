#!/usr/bin/env bash
# Uji stack di VM lokal (tanpa domain/TLS) — build, up, migrasi.
#   export VM_IP=$(hostname -I | awk '{print $1}')
#   echo "VM_IP=${VM_IP}" >> .env.local
#   ./scripts/deploy-local.sh
#   ./scripts/deploy-local.sh --seed
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE=docker-compose.local.yml
ENV_FILE=.env.local
SEED=false

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    -h|--help)
      echo "Usage: $0 [--seed]"
      exit 0
      ;;
    *) echo "Argumen tidak dikenal: $arg"; exit 1 ;;
  esac
done

if [[ ! -f "${ENV_FILE}" ]]; then
  VM_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  if [[ -z "${VM_IP}" ]]; then
    VM_IP=localhost
  fi
  echo "VM_IP=${VM_IP}" > "${ENV_FILE}"
  echo "Buat ${ENV_FILE} dengan VM_IP=${VM_IP}"
fi

set -a
# shellcheck disable=SC1091
source "${ENV_FILE}"
set +a

echo "==> Build & start stack lokal (VM_IP=${VM_IP:-localhost})"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" up -d --build

echo "==> Migrasi database"
docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" exec backend alembic upgrade head

echo "==> Seed klien OAuth internal (Langkah 48)"
bash scripts/seed-oauth-clients.sh "${COMPOSE_FILE}" "${ENV_FILE}"

if $SEED; then
  echo "==> Seed pilot Fase 0 (seed + seed_content + reindex)"
  bash scripts/seed-pilot.sh "${COMPOSE_FILE}" "${ENV_FILE}"
fi

IP="${VM_IP:-localhost}"
echo ""
echo "Stack lokal siap."
echo "  App:      http://${IP}:3000"
echo "  API:      http://${IP}:8000/api/v1/health"
echo "  MinIO:    http://${IP}:9000 (konsol :9001)"
echo "  Meili:    http://${IP}:7700"
echo ""
echo "Verifikasi: ./scripts/verify-phase0.sh --local"
echo "Fitur: /learn · /factory/pipelines · /analytics · /hub/transformer"
