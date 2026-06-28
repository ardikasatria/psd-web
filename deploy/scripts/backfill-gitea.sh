#!/usr/bin/env bash
# Backfill repo PSD lama ke Gitea (Langkah 50.4). Idempotent untuk repo yang sudah ter-link.
set -euo pipefail
cd "$(dirname "$0")/.."

COMPOSE_FILE="${1:-docker-compose.prod.yml}"

if [[ ! -f .env ]]; then
  echo "deploy/.env belum ada."
  exit 1
fi

echo "==> Backfill repo ke Gitea"
docker compose -f "${COMPOSE_FILE}" exec -T backend python -m app.gitea.backfill
