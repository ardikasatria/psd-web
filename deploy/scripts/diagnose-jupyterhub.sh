#!/usr/bin/env bash
# Diagnosa JupyterHub + koneksi backend → Hub (502 pada POST /notebooks/.../launch).
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE_FILE="${1:-docker-compose.prod.yml}"

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

echo "=== JupyterHub / notebook launch diagnostics ==="
echo ""

if [[ ! -f .env ]]; then
  echo "ERROR: deploy/.env tidak ada"
  exit 1
fi
set -a
# shellcheck disable=SC1091
source .env
set +a

echo "1. Status kontainer"
compose ps jupyterhub backend caddy 2>/dev/null || compose ps
echo ""

echo "2. Image single-user (wajib untuk spawn)"
if docker image inspect psd-singleuser:latest >/dev/null 2>&1; then
  echo "  OK  psd-singleuser:latest ada"
else
  echo "  GAGAL psd-singleuser:latest tidak ada — jalankan: ./scripts/build-hub-images.sh"
fi
echo ""

echo "3. Env token Hub (harus sama di backend & jupyterhub)"
if [[ -z "${PSD_HUB_SERVICE_TOKEN:-}" ]]; then
  echo "  GAGAL PSD_HUB_SERVICE_TOKEN kosong di deploy/.env"
  echo "        Tambahkan: PSD_HUB_SERVICE_TOKEN=\$(openssl rand -hex 32)"
  echo "        Lalu: compose up -d --build backend jupyterhub"
else
  echo "  OK  PSD_HUB_SERVICE_TOKEN terisi (${#PSD_HUB_SERVICE_TOKEN} karakter)"
fi
if [[ -z "${HUB_OIDC_SECRET:-}" ]]; then
  echo "  WARN HUB_OIDC_SECRET kosong — login hub.projeksainsdata.com bisa gagal"
  echo "        Salin client_secret jupyterhub dari: ./scripts/seed-oauth-clients.sh"
fi
echo ""

echo "4. Backend → JupyterHub (internal http://jupyterhub:8000/hub/api)"
if compose exec -T backend python -c "
import os, httpx
url = (os.environ.get('PSD_HUB_API_URL') or '').rstrip('/') or 'http://jupyterhub:8000/hub/api'
tok = os.environ.get('PSD_HUB_SERVICE_TOKEN', '')
if not tok:
    print('  GAGAL PSD_HUB_SERVICE_TOKEN kosong di kontainer backend')
    raise SystemExit(1)
r = httpx.get(f'{url}/', headers={'Authorization': f'token {tok}'}, timeout=10)
print(f'  PSD_HUB_API_URL={url}')
print(f'  GET /hub/api/ → HTTP {r.status_code}')
if r.status_code >= 400:
    print('  GAGAL Hub menolak token service — samakan PSD_HUB_SERVICE_TOKEN & restart jupyterhub+backend')
    raise SystemExit(1)
print('  OK  backend bisa menjangkau Hub API')
" 2>/dev/null; then
  :
else
  echo "  GAGAL tidak bisa exec backend atau Hub tidak terjangkau"
  echo "        Cek: compose logs jupyterhub --tail 40"
fi
echo ""

echo "5. Hub publik (Caddy → jupyterhub)"
if curl -fsS -o /dev/null -w "  https://hub.${DOMAIN}/hub/login → HTTP %{http_code}\n" "https://hub.${DOMAIN}/hub/login" 2>/dev/null; then
  :
else
  echo "  WARN tidak bisa curl https://hub.${DOMAIN}/hub/login dari host ini"
fi
echo ""

echo "6. Log JupyterHub terakhir (spawn error sering di sini)"
compose logs jupyterhub --tail 25 2>/dev/null || true
echo ""
echo "=== Selesai ==="
echo "Jika spawn gagal: pastikan psd-singleuser:latest, Docker socket Hub, jaringan psd-net."
echo "Setelah ubah .env: compose up -d --build backend jupyterhub && compose restart caddy"
