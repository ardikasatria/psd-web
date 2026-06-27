#!/usr/bin/env bash
# Ganti URL media lama storage.* → api.* di database (setelah proxy MinIO dipindah ke api).
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  echo "deploy/.env belum ada."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

FROM="https://storage.${DOMAIN}"
TO="https://api.${DOMAIN}"

echo "Migrasi URL media: ${FROM} → ${TO}"

docker compose -f docker-compose.prod.yml exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<SQL
UPDATE users
SET avatar_url = replace(avatar_url, '${FROM}', '${TO}')
WHERE avatar_url LIKE '${FROM}%';

UPDATE users
SET banner_url = replace(banner_url, '${FROM}', '${TO}')
WHERE banner_url LIKE '${FROM}%';
SQL

echo "Selesai. Avatar/banner yang tersimpan sekarang mengarah ke api.${DOMAIN}."
