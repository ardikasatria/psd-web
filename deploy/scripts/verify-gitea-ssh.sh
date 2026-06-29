#!/usr/bin/env bash
# Verifikasi SSH Git Gitea — jalankan dari laptop ATAU dari VM.
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
echo "Git SSH:    port $GITEA_SSH_PORT (URL clone)"
echo "Admin SSH:  port $ADMIN_SSH_PORT (VM)"
echo

fail=0
warn_count=0

compose_files() {
  if [[ "${GITEA_SSH_MODE:-interim}" == "passthrough" ]] && [[ -f "$DEPLOY_DIR/docker-compose.gitea-passthrough.yml" ]]; then
    echo "-f" "$DEPLOY_DIR/docker-compose.prod.yml" "-f" "$DEPLOY_DIR/docker-compose.gitea-passthrough.yml"
  else
    echo "-f" "$DEPLOY_DIR/docker-compose.prod.yml"
  fi
}

if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
  echo "--- [1] Path B — port 22 host sshd (git@ → Gitea via Match User git) ---"
  echo "INFO: banner idcloudhost sebelum auth = normal (kosmetik). Hilangkan: sudo diagnose-gitea-ssh.sh --fix-banner"
else
  echo "--- [1] Port $GITEA_SSH_PORT ---"
  if timeout 8 bash -c "echo | nc -w 5 ${GIT_HOST} ${GITEA_SSH_PORT}" >/dev/null 2>&1; then
    echo "OK: port $GITEA_SSH_PORT terbuka"
  else
    echo "GAGAL: port $GITEA_SSH_PORT tidak dapat dijangkau"
    fail=1
  fi
fi

echo
echo "--- [2] Kontainer Gitea ---"
if command -v docker >/dev/null 2>&1; then
  # shellcheck disable=SC2046
  if docker compose $(compose_files) ps gitea 2>/dev/null | grep -q "Up"; then
    echo "OK: gitea Up"
  else
    echo "GAGAL: gitea tidak Up → ./scripts/recover-gitea-stack.sh"
    fail=1
  fi
fi

echo
echo "--- [3] Blok passthrough sshd ---"
if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
  if grep -q 'psd-gitea-authorized-keys' /etc/ssh/sshd_config 2>/dev/null; then
    echo "OK: Match User git + AuthorizedKeysCommand terdaftar"
  else
    echo "GAGAL: passthrough belum dikonfigurasi → sudo ./scripts/setup-gitea-ssh-passthrough.sh --apply"
    fail=1
  fi
fi

echo
echo "--- [4] Uji SSH git@ (dari mesin ini) ---"
SSH_TEST=(ssh -o BatchMode=yes -o ConnectTimeout=8 -o StrictHostKeyChecking=accept-new)
[[ "$GITEA_SSH_MODE" != "passthrough" && "$GITEA_SSH_PORT" != "22" ]] && SSH_TEST+=(-p "$GITEA_SSH_PORT")
SSH_TEST+=(-T "git@${GIT_HOST}")

"${SSH_TEST[@]}" 2>&1 | tee /tmp/psd-gitea-ssh-test.log || true

if grep -qi "successfully authenticated\|Git PSD siap digunakan" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
  echo "OK: autentikasi Gitea berhasil"
elif grep -qi "password" /tmp/psd-gitea-ssh-test.log 2>/dev/null && ! grep -qi "PasswordAuthentication no" /tmp/psd-gitea-ssh-test.log; then
  if grep -qi "password:" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    echo "GAGAL: masih minta password — Match User git belum aktif"
    fail=1
  fi
elif grep -qi "Permission denied (publickey)" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
  if [[ "$GITEA_SSH_MODE" == "passthrough" ]]; then
    echo "OK: passthrough aktif (publickey denied = kunci belum cocok, BUKAN kegagalan infra)"
    echo "     Jalankan: sudo ./scripts/diagnose-gitea-ssh.sh --pubkey \"<kunci-laptop>\""
  echo "     (Pesan panjang Gitea diganti shim: Hi <user>! Git PSD siap digunakan.)"
    warn_count=$((warn_count + 1))
  else
    echo "INFO: publickey denied — daftarkan kunci di /settings/git"
  fi
  if grep -qi "idcloudhost\|AUTHORIZED ACCESS ONLY" /tmp/psd-gitea-ssh-test.log 2>/dev/null; then
    echo "INFO: banner idcloudhost tampil (normal di Path B sebelum auth sukses)"
  fi
else
  echo "INFO: lihat log di atas"
fi

echo
if [[ "$fail" -eq 0 ]]; then
  if [[ "$warn_count" -gt 0 ]]; then
    echo "=== Ringkasan: infra OK — perbaiki pendaftaran kunci (diagnose --pubkey) ==="
  else
    echo "=== Ringkasan: lulus ==="
  fi
  exit 0
fi
echo "=== Ringkasan: ada masalah infrastruktur ==="
exit 1
