#!/usr/bin/env bash
# Panduan setup OAuth Gitea → PSD OIDC (Langkah 50.3). Jalankan SEKALI setelah Gitea hidup.
set -euo pipefail
cd "$(dirname "$0")/.."

set -a
# shellcheck disable=SC1091
source .env
set +a

echo "=== Langkah 50.3 — OAuth Gitea via PSD OIDC ==="
echo ""
echo "1. Buat admin Gitea pertama kali via UI: https://git.${DOMAIN}/"
echo "2. Buat token admin: Settings → Applications → Generate Token (scope: all)"
echo "3. Simpan ke deploy/.env:"
echo "     GITEA_ADMIN_TOKEN=<token>"
echo "4. Redeploy backend: ./scripts/deploy.sh"
echo "5. Tambah OAuth source (jalankan di container gitea):"
echo ""
cat <<EOF
docker compose -f docker-compose.prod.yml exec gitea gitea admin auth add-oauth \\
  --name PSD \\
  --provider openidConnect \\
  --auto-discover-url https://api.${DOMAIN}/.well-known/openid-configuration \\
  --key gitea \\
  --secret '<client_secret_dari_seed_oauth_gitea>'
EOF
echo ""
echo "6. Verifikasi: logout Gitea → Sign in with PSD"
echo "7. Backfill repo lama: ./scripts/backfill-gitea.sh"
