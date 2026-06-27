#!/usr/bin/env bash
# Paksa Caddy mengambil ulang sertifikat Let's Encrypt untuk storage.* (setelah DNS diperbaiki).
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

echo "Restart Caddy (DOMAIN=${DOMAIN})..."
docker compose -f docker-compose.prod.yml restart caddy

echo "Menunggu provisioning TLS (20 detik)..."
sleep 20

if curl -fsSI --max-time 15 "https://storage.${DOMAIN}/psd-media/" >/dev/null 2>&1; then
  echo "OK  https://storage.${DOMAIN}/psd-media/"
  exit 0
fi

echo "FAIL TLS storage.${DOMAIN} — log Caddy:"
docker compose -f docker-compose.prod.yml logs caddy --tail=50

echo ""
echo "Media publik tetap tersedia via https://api.${DOMAIN}/psd-media/ (setelah redeploy Caddyfile terbaru)."
echo "Migrasi URL lama: ./scripts/migrate-storage-urls.sh"
exit 1
