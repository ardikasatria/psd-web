#!/usr/bin/env bash
# Buat deploy/.env dengan rahasia acak. Jalankan sekali di VM sebelum deploy pertama.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  echo "deploy/.env sudah ada — tidak ditimpa."
  echo "Upgrade Langkah 48? Jalankan: ./scripts/init-oauth-key.sh && ./scripts/deploy.sh"
  exit 0
fi

DOMAIN="${1:-projeksainsdata.com}"

cat > .env <<EOF
DOMAIN=${DOMAIN}
POSTGRES_USER=psd
POSTGRES_PASSWORD=$(openssl rand -hex 24)
POSTGRES_DB=psd
MINIO_ROOT_USER=psd
MINIO_ROOT_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
MEILI_KEY=$(openssl rand -hex 24)
GITEA_DB_PASSWORD=$(openssl rand -hex 24)

# JupyterHub (Langkah 52) — ikut deploy default; HUB_OIDC_SECRET diisi setelah seed-oauth-clients
JUPYTERHUB_CRYPT_KEY=$(openssl rand -hex 32)
HUB_OIDC_SECRET=
PSD_HUB_SERVICE_TOKEN=$(openssl rand -hex 32)

# Opsional — fitur AI (Langkah 38/40); isi sebelum pilot jika sintesis/ruang ide AI aktif
OPENAI_API_KEY=
AI_MODEL=gpt-4o-mini
FACTORY_RUN_TIMEOUT_S=90
EOF

chmod 600 .env
bash scripts/init-oauth-key.sh
echo "deploy/.env dibuat untuk DOMAIN=${DOMAIN}"
echo "Kunci OIDC: deploy/secrets/psd_oidc.pem (di-mount ke backend saat deploy)"
echo "Edit DOMAIN bila perlu, lalu jalankan: ./scripts/deploy.sh"
