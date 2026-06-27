#!/usr/bin/env bash
# Deploy / redeploy produksi di VM.
#   ./scripts/deploy.sh          # build, up, migrasi
#   ./scripts/deploy.sh --seed   # + isi data demo (staging/pilot)
set -euo pipefail
cd "$(dirname "$0")/.."

SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    -h|--help)
      echo "Usage: $0 [--seed]"
      exit 0
      ;;
    *) echo "Argumen tidak dikenal: $arg (pakai --seed atau --help)"; exit 1 ;;
  esac
done

if [[ ! -f .env ]]; then
  echo "deploy/.env belum ada. Jalankan: ./scripts/init-env.sh [domain]"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

if [[ -z "${MEILI_KEY:-}" ]]; then
  echo "MEILI_KEY belum ada di deploy/.env."
  echo "Tambahkan: echo 'MEILI_KEY='\$(openssl rand -hex 24) >> .env"
  exit 1
fi

echo "==> Build & start stack (DOMAIN=${DOMAIN})"
docker compose -f docker-compose.prod.yml up -d --build

echo "==> Migrasi database (alembic upgrade head)"
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

if $SEED; then
  echo "==> Seed pilot Fase 0 (seed + seed_content + reindex)"
  bash scripts/seed-pilot.sh docker-compose.prod.yml
fi

echo ""
echo "Deploy selesai."
echo "  API:      https://api.${DOMAIN}/api/v1/health"
echo "  App:      https://${DOMAIN}"
echo "  Storage:  https://storage.${DOMAIN}"
echo ""
echo "Verifikasi Fase 0:"
echo "  ./scripts/verify.sh"
echo "  ./scripts/verify-phase0.sh   # endpoint modul 38–47"
echo ""
echo "Fitur utama:"
echo "  Belajar:      https://${DOMAIN}/learn"
echo "  Pabrik Data:  https://${DOMAIN}/factory/pipelines"
echo "  Analitik:     https://${DOMAIN}/analytics"
echo "  Transformer:  https://${DOMAIN}/hub/transformer"
echo ""
if ! $SEED; then
  echo "Seed pilot: ./scripts/deploy.sh --seed"
fi
