#!/usr/bin/env bash
# Cek kesehatan stack produksi setelah deploy.
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

API="https://api.${DOMAIN}/api/v1"
APP="https://${DOMAIN}"

check() {
  local name="$1" url="$2"
  if curl -fsS --max-time 15 "$url" > /dev/null; then
    echo "  OK  ${name}"
  else
    echo "  FAIL ${name} (${url})"
    return 1
  fi
}

echo "Verifikasi DOMAIN=${DOMAIN}"
fail=0
check "API health" "${API}/health" || fail=1
check "API db" "${API}/health/db" || fail=1
check "App (frontend)" "${APP}" || fail=1
check "Media (MinIO via api)" "https://api.${DOMAIN}/psd-media/" || fail=1

echo ""
echo "Migrasi Alembic (harus head = 042_dashboards):"
if docker compose -f docker-compose.prod.yml exec -T backend alembic current 2>/dev/null | grep -q "042_dashboards"; then
  echo "  OK  alembic head (042_dashboards)"
else
  echo "  WARN alembic current — cek: docker compose -f docker-compose.prod.yml exec backend alembic current"
  fail=1
fi

echo ""
echo "Endpoint publik Fase 0:"
bash scripts/verify-phase0.sh || fail=1

echo ""
echo "Login demo (setelah --seed): budi@psd.id / demo"

exit $fail
