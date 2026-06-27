#!/usr/bin/env bash
# Ganti URL media api.* → storage.* di database (kembali ke subdomain storage).
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

FROM="https://api.${DOMAIN}"
TO="https://storage.${DOMAIN}"

echo "Migrasi URL media: ${FROM} → ${TO}"

docker compose -f docker-compose.prod.yml exec -T db psql -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" <<SQL
UPDATE users
SET avatar_url = replace(avatar_url, '${FROM}', '${TO}')
WHERE avatar_url LIKE '${FROM}/psd-media%' OR avatar_url LIKE '${FROM}/psd-assets%';

UPDATE users
SET banner_url = replace(banner_url, '${FROM}', '${TO}')
WHERE banner_url LIKE '${FROM}/psd-media%' OR banner_url LIKE '${FROM}/psd-assets%';
SQL

echo "Selesai. Avatar/banner sekarang mengarah ke storage.${DOMAIN}."
