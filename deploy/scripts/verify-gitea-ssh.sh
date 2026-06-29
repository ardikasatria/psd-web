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
GITEA_SSH_MODE="${GITEA_SSH_MODE:-interim}"
ADMIN_SSH_PORT="${ADMIN_SSH_PORT:-22}"

echo "=== Verifikasi SSH Git PSD ==="
echo "Domain:     $DOMAIN"
echo "Git host:   $GIT_HOST"
echo "Mode:       $GITEA_SSH_MODE"
echo "Git SSH:    port $GITEA_SSH_PORT (ditampilkan ke pengguna)"
echo "Admin SSH:  port $ADMIN_SSH_PORT (VM)"
echo

fail=0

if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
  echo "--- [1] Path B passthrough — port 22 host (user git → Gitea, user admin → shell) ---"
  echo "Uji Git dari laptop: ssh -T git@$GIT_HOST"
  echo "Uji admin: ssh <user>@<ip-vm>"
else
  echo "--- [1] Port $GITEA_SSH_PORT (harus Gitea, bukan banner idcloudhost) ---"
  if timeout 8 bash -c "echo | nc -w 5 ${GIT_HOST} ${GITEA_SSH_PORT}" >/dev/null 2>&1; then
    echo "OK: port $GITEA_SSH_PORT terbuka di $GIT_HOST"
  else
    echo "GAGAL: port $GITEA_SSH_PORT tidak dapat dijangkau — cek docker compose gitea & firewall idcloudhost"
    fail=1
  fi
fi

echo
echo "--- [2] Port 22 ke git.$DOMAIN ---"
if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
  echo "OK: Path B — port 22 dipakai host sshd; koneksi git@ diteruskan ke Gitea (bukan shell admin)"
elif [[ "$GITEA_SSH_PORT" == "22" ]]; then
  echo "SKIP: port 22 didedikasikan ke Gitea (Path A)"
else
  echo "PERINGATAN: port 22 masih SSH admin VM — ssh -T git@$GIT_HOST tanpa -p berbahaya"
  echo "  Gunakan Path B (passthrough) atau Path A, atau ssh -p $GITEA_SSH_PORT"
fi

compose_files() {
  if [[ "${GITEA_SSH_MODE:-interim}" == "passthrough" ]] && [[ -f "$DEPLOY_DIR/docker-compose.gitea-passthrough.yml" ]]; then
    echo "-f" "$DEPLOY_DIR/docker-compose.prod.yml" "-f" "$DEPLOY_DIR/docker-compose.gitea-passthrough.yml"
  else
    echo "-f" "$DEPLOY_DIR/docker-compose.prod.yml"
  fi
}

echo
echo "--- [3] Kontainer Gitea ---"
if command -v docker >/dev/null 2>&1 && [[ -f "$DEPLOY_DIR/docker-compose.prod.yml" ]]; then
  # shellcheck disable=SC2046
  if docker compose $(compose_files) ps gitea 2>/dev/null | grep -q "Up"; then
    echo "OK: kontainer gitea berjalan"
    # shellcheck disable=SC2046
    docker compose $(compose_files) exec -T gitea sh -c \
      'grep -E "START_SSH_SERVER|SSH_PORT|SSH_LISTEN" /data/gitea/conf/app.ini 2>/dev/null || echo "(app.ini belum ada)"' \
      || true
  else
    echo "GAGAL: kontainer gitea tidak Up"
    echo "  Jalankan: ./scripts/recover-gitea-stack.sh"
    echo "  Log: docker compose \$(compose) logs gitea --tail 40"
    fail=1
  fi
else
  echo "SKIP: docker tidak tersedia di mesin ini"
fi

echo
echo "--- [4] Uji SSH Git (dari mesin ini) ---"
SSH_TEST=(ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new)
if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
  : # port 22 default
elif [[ "$GITEA_SSH_PORT" != "22" ]]; then
  SSH_TEST+=(-p "$GITEA_SSH_PORT")
fi
SSH_TEST+=(-T "git@${GIT_HOST}")

if "${SSH_TEST[@]}" 2>&1 | tee /tmp/psd-gitea-ssh-test.log; then
  echo "OK: autentikasi SSH Git berhasil"
else
  rc=$?
  if grep -qi "idcloudhost\|AUTHORIZED ACCESS ONLY" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
      echo "GAGAL: banner idcloudhost — passthrough belum aktif (jalankan sudo setup-gitea-ssh-passthrough.sh --apply)"
    else
      echo "GAGAL: masih SSH admin VM — gunakan -p $GITEA_SSH_PORT atau migrasi Path B/A"
    fi
    fail=1
  elif grep -qi "successfully authenticated" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    echo "OK: Gitea merespons"
  elif grep -qi "Permission denied (publickey)" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
      echo "OK: passthrough aktif — daftarkan kunci di /settings/git (publickey ditolak = normal tanpa kunci)"
    else
      echo "OK: Gitea SSH merespons (daftarkan kunci di /settings/git)"
    fi
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
