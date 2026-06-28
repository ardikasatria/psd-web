#!/usr/bin/env bash
# Deploy / redeploy produksi di VM.
#   ./scripts/deploy.sh              # stack inti + JupyterHub (default)
#   ./scripts/deploy.sh --seed       # + data demo pilot
#   COMPOSE_PROFILES=bi ./scripts/deploy.sh      # + Superset (butuh psd-superset/)
#   COMPOSE_PROFILES=ml ./scripts/deploy.sh      # + MLflow
#   COMPOSE_PROFILES=bi,ml ./scripts/deploy.sh   # Superset + MLflow opsional
set -euo pipefail
cd "$(dirname "$0")/.."

SEED=false
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=true ;;
    -h|--help)
      echo "Usage: $0 [--seed]"
      echo ""
      echo "JupyterHub selalu ikut deploy (service jupyterhub di compose)."
      echo ""
      echo "Profile opsional tambahan (via env COMPOSE_PROFILES, pisah koma):"
      echo "  bi   Superset     (folder psd-superset/ wajib ada)"
      echo "  ml   MLflow"
      echo ""
      echo "Contoh: COMPOSE_PROFILES=bi,ml $0"
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

ROOT="$(cd .. && pwd)"
if [[ ! -f "${ROOT}/psd-jupyterhub/docker/Dockerfile.hub" ]]; then
  echo "Folder psd-jupyterhub/ tidak lengkap — JupyterHub wajib ada di repo."
  echo "Pastikan git pull sudah menarik psd-jupyterhub/ sebelum deploy."
  exit 1
fi

# JUPYTERHUB_CRYPT_KEY — buat otomatis bila belum ada / masih placeholder
if [[ -z "${JUPYTERHUB_CRYPT_KEY:-}" ]] || [[ "${JUPYTERHUB_CRYPT_KEY}" == ganti-* ]]; then
  _hub_key="$(openssl rand -hex 32)"
  if grep -q '^JUPYTERHUB_CRYPT_KEY=' .env 2>/dev/null; then
    sed -i.bak "s/^JUPYTERHUB_CRYPT_KEY=.*/JUPYTERHUB_CRYPT_KEY=${_hub_key}/" .env
    rm -f .env.bak
  else
    echo "JUPYTERHUB_CRYPT_KEY=${_hub_key}" >> .env
  fi
  echo "==> JUPYTERHUB_CRYPT_KEY dibuat otomatis di deploy/.env"
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${HUB_OIDC_SECRET:-}" ]]; then
  echo ""
  echo "==> Catatan: HUB_OIDC_SECRET masih kosong."
  echo "    Setelah deploy, salin client_secret jupyterhub dari output seed-oauth-clients"
  echo "    ke deploy/.env, lalu jalankan ./scripts/deploy.sh sekali lagi."
  echo ""
fi

echo "==> Build image single-user JupyterHub"
bash scripts/build-hub-images.sh

echo "==> Build & start stack (DOMAIN=${DOMAIN}, JupyterHub=on${COMPOSE_PROFILES:+, profiles=${COMPOSE_PROFILES}})"
compose "${profile_args[@]}" up -d --build

echo "==> Reload Caddy (sertifikat TLS subdomain)"
compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile 2>/dev/null \
  || compose restart caddy

echo "==> Migrasi database (alembic upgrade head)"
compose exec backend alembic upgrade head

echo "==> Seed klien OAuth internal (Langkah 48)"
bash scripts/seed-oauth-clients.sh docker-compose.prod.yml

if [[ -n "${HUB_OIDC_SECRET:-}" ]]; then
  echo "==> Restart JupyterHub (muat HUB_OIDC_SECRET terbaru)"
  compose restart jupyterhub 2>/dev/null || true
fi

if $SEED; then
  echo "==> Seed pilot Fase 0 (seed + seed_content + reindex)"
  bash scripts/seed-pilot.sh docker-compose.prod.yml
fi

echo ""
echo "Deploy selesai."
echo "  API:      https://api.${DOMAIN}/api/v1/health"
echo "  App:      https://${DOMAIN}"
echo "  Media:    https://storage.${DOMAIN}/psd-media/"
echo "  JupyterHub: https://hub.${DOMAIN}/hub/spawn"
echo ""
echo "Verifikasi Fase 0:"
echo "  ./scripts/verify.sh"
echo "  ./scripts/verify-phase0.sh   # endpoint modul 38–47"
echo ""
echo "Fitur utama:"
echo "  Belajar:      https://${DOMAIN}/learn"
echo "  Notebook:     https://${DOMAIN}/notebooks"
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
  echo "Layanan opsional (Superset/MLflow) belum diaktifkan."
  echo "  COMPOSE_PROFILES=bi,ml ./scripts/deploy.sh"
fi
if [[ -z "${HUB_OIDC_SECRET:-}" ]]; then
  echo ""
  echo "JupyterHub OAuth: isi HUB_OIDC_SECRET di deploy/.env lalu ./scripts/deploy.sh"
fi
