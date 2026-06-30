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
  docker image inspect psd-singleuser:latest --format '  built {{.Created}} size {{.Size}} bytes'
else
  echo "  GAGAL psd-singleuser:latest tidak ada — jalankan: ./scripts/build-hub-images.sh"
fi
echo ""
echo "2b. Timeout spawn Hub (http_timeout default 30s terlalu pendek untuk VM kecil)"
echo "  PSD_HUB_SPAWN_TIMEOUT=${PSD_HUB_SPAWN_TIMEOUT:-300} PSD_HUB_HTTP_TIMEOUT=${PSD_HUB_HTTP_TIMEOUT:-180}"

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
try:
    r = httpx.get('http://jupyterhub:8000/hub/login', timeout=10, follow_redirects=True)
    print(f'  GET /hub/login (internal) → HTTP {r.status_code}')
except Exception as e:
    print(f'  WARN GET /hub/login gagal: {e}')
" 2>/dev/null; then
  :
fi
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

echo "7. Uji startup image single-user (tanpa Hub)"
if docker run --rm --name psd-singleuser-smoke-test \
  -e PSD_APP_BASE_URL="https://${DOMAIN}" \
  -e JUPYTER_ENABLE_LAB=no \
  psd-singleuser:latest \
  bash -lc 'python -c "import jupyter_server; import pandas; print(\"OK singleuser imports\")"' 2>&1 | sed 's/^/  /'; then
  echo "  OK  image bisa dijalankan"
else
  echo "  GAGAL image crash — rebuild: ./scripts/build-hub-images.sh"
fi
echo ""

echo "8. Uji spawn single-user via Hub API (butuh 1–3 menit pertama kali)"
if compose exec -T backend python -c "
import os, sys
from app.core.config import settings
from app.hub.hub_client import HubError, JupyterHubClient

user = os.environ.get('HUB_TEST_USER', 'psd_spawn_probe')
timeout = int(os.environ.get('PSD_HUB_SPAWN_TIMEOUT', '120'))
client = JupyterHubClient(settings.PSD_HUB_API_URL, settings.PSD_HUB_SERVICE_TOKEN)
try:
    client.stop_server(user)
except Exception:
    pass
try:
    model = client.ensure_server(user, timeout_s=timeout, interval=2.0)
    ready = (model.get('servers') or {}).get('', {}).get('ready')
    print(f'  OK  spawn user={user} ready={ready}')
except HubError as e:
    print(f'  GAGAL spawn: HTTP {e.status} — {e.body[:300]}')
    sys.exit(1)
except Exception as e:
    print(f'  GAGAL spawn: {e}')
    sys.exit(1)
finally:
    try:
        client.stop_server(user)
    except Exception:
        pass
" 2>/dev/null; then
  :
else
  echo "  GAGAL spawn — cek image psd-singleuser:latest & logs jupyterhub"
fi
echo ""
echo "=== Selesai ==="
echo "Jika spawn gagal: pastikan psd-singleuser:latest, Docker socket Hub, jaringan psd-net."
echo "Setelah ubah .env: compose up -d --build backend jupyterhub && compose restart caddy"
