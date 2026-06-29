#!/usr/bin/env bash
# Pulihkan Gitea + backend setelah passthrough salah bind port 22 (kontainer Exit / API 502).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"

cd "$DEPLOY_DIR"

echo "=== Pulihkan stack Git (Gitea + backend) ==="

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$ENV_FILE"
fi

MODE="${GITEA_SSH_MODE:-interim}"

if [[ "$MODE" == "passthrough" ]]; then
  echo "Mode passthrough — set GITEA_SSH_PUBLISH=127.0.0.1:2222:22 (bukan 22:22)"
  for kv in \
    "GITEA_SSH_PORT=22" \
    "GITEA_SSH_PUBLISH=127.0.0.1:2222:22"
  do
    key="${kv%%=*}"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
      sed -i "s|^${key}=.*|${kv}|" "$ENV_FILE"
    else
      echo "$kv" >> "$ENV_FILE"
    fi
  done
  COMPOSE=(docker compose -f docker-compose.prod.yml -f docker-compose.gitea-passthrough.yml)
else
  echo "Mode interim — GITEA_SSH_PUBLISH=2222:22"
  for kv in "GITEA_SSH_PORT=2222" "GITEA_SSH_PUBLISH=2222:22"; do
    key="${kv%%=*}"
    if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
      sed -i "s|^${key}=.*|${kv}|" "$ENV_FILE"
    else
      echo "$kv" >> "$ENV_FILE"
    fi
  done
  COMPOSE=(docker compose -f docker-compose.prod.yml)
fi

echo "--- .env (SSH) ---"
grep -E '^GITEA_SSH_' "$ENV_FILE" 2>/dev/null || true

echo "--- Naikkan gitea + backend ---"
"${COMPOSE[@]}" up -d gitea backend

sleep 4
echo "--- Status ---"
"${COMPOSE[@]}" ps gitea backend

if ! "${COMPOSE[@]}" ps gitea 2>/dev/null | grep -q "Up"; then
  echo
  echo "GAGAL: gitea masih tidak Up. Log:"
  "${COMPOSE[@]}" logs gitea --tail 30
  exit 1
fi

echo
echo "--- Health API ---"
if "${COMPOSE[@]}" exec -T backend python -c "
import httpx
r = httpx.get('http://gitea:3000/api/v1/version', timeout=10)
print('gitea:', r.status_code, r.text[:120])
" 2>/dev/null; then
  :
else
  echo "WARN: backend tidak bisa jangkau gitea:3000"
fi

echo
echo "OK — cek https://api.${DOMAIN:-projeksainsdata.com}/api/v1/health"
echo "Passthrough SSH: sudo ./scripts/setup-gitea-ssh-passthrough.sh --apply (jika sshd belum dikonfigurasi)"
