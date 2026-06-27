#!/usr/bin/env bash
# Backup Postgres ke ~/backup-YYYY-MM-DD.sql.gz
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source .env
set +a

OUT="${HOME}/backup-$(date +%F).sql.gz"
docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" | gzip > "${OUT}"
echo "Backup: ${OUT}"
