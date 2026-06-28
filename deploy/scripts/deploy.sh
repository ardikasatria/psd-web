#!/usr/bin/env bash
# Deploy / redeploy produksi di VM.
#   ./scripts/deploy.sh              # stack inti (Tanpa JupyterHub/Superset/MLflow)
#   ./scripts/deploy.sh --seed       # + data demo pilot
#   COMPOSE_PROFILES=hub ./scripts/deploy.sh     # + JupyterHub (butuh psd-jupyterhub/)
#   COMPOSE_PROFILES=bi ./scripts/deploy.sh      # + Superset (butuh psd-superset/)
#   COMPOSE_PROFILES=ml ./scripts/deploy.sh      # + MLflow
#   COMPOSE_PROFILES=hub,bi,ml ./scripts/deploy.sh   # semua opsional Fase 1
set -euo pipefail
cd "$(dirname "$0")/.."

SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    -h|--help)
      echo "Usage: $0 [--seed]"
      echo ""
      echo "Profile opsional (via env COMPOSE_PROFILES, pisah koma):"
      echo "  hub  JupyterHub   (folder psd-jupyterhub/ wajib ada)"
      echo "  bi   Superset     (folder psd-superset/ wajib ada)"
      echo "  ml   MLflow"
      echo ""
      echo "Contoh: COMPOSE_PROFILES=hub,bi,ml $0"
      exit 0
      ;;
    *) echo "Argumen tidak dikenal: $arg (pakai --seed atau --help)"; exit 1 ;;
  esac
done

compose() {
  docker compose -f docker-compose.prod.yml "$@"
}

profile_args=()
if [[ -n "${COMPOSE_PROFILES:-}" ]]; then
  IFS=',' read -ra _profiles <<< "${COMPOSE_PROFILES}"
  for p in "${_profiles[@]}"; do
    p="${p// /}"
    [[ -n "$p" ]] && profile_args+=(--profile "$p")
  done
fi

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

if [[ ! -f secrets/psd_oidc.pem ]]; then
  echo "Kunci OIDC belum ada. Jalankan: ./scripts/init-oauth-key.sh"
  exit 1
fi

echo "==> Build & start stack (DOMAIN=${DOMAIN}${COMPOSE_PROFILES:+, profiles=${COMPOSE_PROFILES}})"
compose "${profile_args[@]}" up -d --build

echo "==> Reload Caddy (sertifikat TLS subdomain)"
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
  || compose restart caddy

echo "==> Migrasi database (alembic upgrade head)"
compose exec backend alembic upgrade head

echo "==> Seed klien OAuth internal (Langkah 48)"
bash scripts/seed-oauth-clients.sh docker-compose.prod.yml

if $SEED; then
  echo "==> Seed pilot Fase 0 (seed + seed_content + reindex)"
  bash scripts/seed-pilot.sh docker-compose.prod.yml
fi

echo ""
echo "Deploy selesai."
echo "  API:      https://api.${DOMAIN}/api/v1/health"
echo "  App:      https://${DOMAIN}"
echo "  Media:    https://storage.${DOMAIN}/psd-media/"
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
echo "  OIDC:         https://api.${DOMAIN}/.well-known/openid-configuration"
echo "  Flower:       http://127.0.0.1:5555 (SSH tunnel ke VM)"
echo ""
if ! $SEED; then
  echo "Seed pilot: ./scripts/deploy.sh --seed"
fi
if [[ -z "${COMPOSE_PROFILES:-}" ]]; then
  echo ""
  echo "Layanan opsional (JupyterHub/Superset/MLflow) belum diaktifkan."
  echo "  COMPOSE_PROFILES=hub,bi,ml ./scripts/deploy.sh"
fi
