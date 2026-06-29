#!/usr/bin/env bash
# Verifikasi SSH Git Gitea — jalankan dari laptop ATAU dari VM (dengan curl/ssh).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

if [[ -f "$DEPLOY_DIR/.env" ]]; then
  # shellcheck disable=SC1091
  source "$DEPLOY_DIR/.env"
fi

DOMAIN="${DOMAIN:-projeksainsdata.com}"
GIT_HOST="git.${DOMAIN}"
GITEA_SSH_PORT="${GITEA_SSH_PORT:-2222}"
ADMIN_SSH_PORT="${ADMIN_SSH_PORT:-22}"

echo "=== Verifikasi SSH Git PSD ==="
echo "Domain:     $DOMAIN"
echo "Git host:   $GIT_HOST"
echo "Git SSH:    port $GITEA_SSH_PORT (Gitea)"
echo "Admin SSH:  port $ADMIN_SSH_PORT (VM — jangan dipakai untuk git@)"
echo

fail=0

echo "--- [1] Port $GITEA_SSH_PORT (harus Gitea, bukan banner idcloudhost) ---"
if timeout 8 bash -c "echo | nc -w 5 ${GIT_HOST} ${GITEA_SSH_PORT}" >/dev/null 2>&1; then
  echo "OK: port $GITEA_SSH_PORT terbuka di $GIT_HOST"
else
  echo "GAGAL: port $GITEA_SSH_PORT tidak dapat dijangkau — cek docker compose gitea & firewall idcloudhost"
  fail=1
fi

echo
echo "--- [2] Port 22 ke git.$DOMAIN (risiko keamanan bila banner OS) ---"
if [[ "$GITEA_SSH_PORT" == "22" ]]; then
  echo "SKIP: port 22 didedikasikan ke Gitea (Path A)"
else
  echo "PERINGATAN: port 22 masih default — ssh -T git@$GIT_HOST tanpa -p akan ke SSH admin VM"
  echo "  Uji manual: ssh -T git@$GIT_HOST  → jangan masukkan password; migrasi ke Path A bila perlu"
fi

echo
echo "--- [3] Kontainer Gitea ---"
if command -v docker >/dev/null 2>&1 && [[ -f "$DEPLOY_DIR/docker-compose.prod.yml" ]]; then
  if docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" ps gitea 2>/dev/null | grep -q "Up"; then
    echo "OK: kontainer gitea berjalan"
    docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" exec -T gitea sh -c \
      'grep -E "START_SSH_SERVER|SSH_PORT|SSH_LISTEN" /data/gitea/conf/app.ini 2>/dev/null || echo "(app.ini belum ada atau path berbeda)"' \
      || true
  else
    echo "GAGAL: kontainer gitea tidak Up"
    fail=1
  fi
else
  echo "SKIP: docker tidak tersedia di mesin ini"
fi

echo
echo "--- [4] Uji SSH Git (dari mesin ini) ---"
SSH_TEST=(ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new)
if [[ "$GITEA_SSH_PORT" != "22" ]]; then
  SSH_TEST+=(-p "$GITEA_SSH_PORT")
fi
SSH_TEST+=(-T "git@${GIT_HOST}")

if "${SSH_TEST[@]}" 2>&1 | tee /tmp/psd-gitea-ssh-test.log; then
  echo "OK: autentikasi SSH Git berhasil"
else
  rc=$?
  if grep -qi "successfully authenticated" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    echo "OK: Gitea merespons (kunci mungkin belum terdaftar di mesin ini — normal dari VM)"
  elif grep -qi "Permission denied (publickey)" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    echo "OK: Gitea SSH aktif (publickey ditolak — daftarkan kunci di /settings/git dari laptop)"
  elif grep -qi "idcloudhost\|AUTHORIZED ACCESS ONLY" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    echo "GAGAL: masih terhubung ke SSH admin VM — perbaiki port / migrasi Path A"
    fail=1
  else
    echo "INFO: uji SSH exit $rc — lihat log di atas"
  fi
fi

echo
if [[ "$fail" -eq 0 ]]; then
  echo "=== Ringkasan: lulus (dengan catatan di atas) ==="
  exit 0
fi
echo "=== Ringkasan: ada masalah — lihat GAGAL di atas ==="
exit 1
