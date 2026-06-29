#!/usr/bin/env bash
# Path A — dedikasikan port 22 host ke Gitea (gaya GitHub), pindahkan sshd admin ke port lain.
#
# ⚠️  BAHAYA LOCKOUT. Wajib:
#   - Akses konsol/VNC idcloudhost sebagai cadangan
#   - Buka sesi SSH admin BARU di port baru SEBELUM menutup sesi lama
#   - Baca: Instructions/perbaikan-gitea/PERBAIKAN_SSH_GITEA_GITHUB.md
#
# Usage (di VM sebagai root/sudo):
#   ADMIN_SSH_PORT=2202 ./scripts/setup-gitea-ssh-path-a.sh --check
#   ADMIN_SSH_PORT=2202 ./scripts/setup-gitea-ssh-path-a.sh --apply
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"

ADMIN_SSH_PORT="${ADMIN_SSH_PORT:-2202}"
GITEA_SSH_PORT=22
MODE="${1:-}"

usage() {
  sed -n '2,12p' "$0"
  echo
  echo "Flags:"
  echo "  --check   Cek prasyarat tanpa mengubah sistem"
  echo "  --apply   Terapkan (sshd + .env + restart gitea) — butuh sudo"
  exit 1
}

[[ "$MODE" == "--check" || "$MODE" == "--apply" ]] || usage

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$ENV_FILE"
fi
DOMAIN="${DOMAIN:-projeksainsdata.com}"

echo "=== Setup Gitea SSH Path A (GitHub-like) ==="
echo "Git:   git.$DOMAIN port $GITEA_SSH_PORT → kontainer Gitea"
echo "Admin: sshd host port $ADMIN_SSH_PORT (bukan 22)"
echo

if [[ "$GITEA_SSH_PORT" == "$ADMIN_SSH_PORT" ]]; then
  echo "GAGAL: GITEA_SSH_PORT dan ADMIN_SSH_PORT tidak boleh sama"
  exit 1
fi

echo "--- Prasyarat ---"
issues=0

if ! command -v docker >/dev/null; then
  echo "GAGAL: docker tidak ditemukan"
  issues=$((issues + 1))
fi

if [[ ! -f "$DEPLOY_DIR/docker-compose.prod.yml" ]]; then
  echo "GAGAL: docker-compose.prod.yml tidak ada di $DEPLOY_DIR"
  issues=$((issues + 1))
fi

if ss -tlnp 2>/dev/null | grep -q ':22 '; then
  echo "INFO: port 22 sedang dipakai (kemungkinan sshd host)"
else
  echo "INFO: port 22 tidak terlihat listening — mungkin sudah dipindah"
fi

if [[ "$issues" -gt 0 ]]; then
  exit 1
fi

if [[ "$MODE" == "--check" ]]; then
  echo
  echo "Langkah manual sebelum --apply:"
  echo "  1. Panel idcloudhost: buka TCP $ADMIN_SSH_PORT (admin) dan TCP 22 (git)"
  echo "  2. sudo sed -i 's/^#\\?Port .*/Port $ADMIN_SSH_PORT/' /etc/ssh/sshd_config"
  echo "  3. sudo systemctl restart ssh"
  echo "  4. Dari terminal BARU: ssh -p $ADMIN_SSH_PORT \$USER@\$(hostname -I | awk '{print \$1}')"
  echo "  5. Baru jalankan: ADMIN_SSH_PORT=$ADMIN_SSH_PORT $0 --apply"
  echo
  echo "Pengerasan (disarankan setelah port admin stabil):"
  echo "  - PasswordAuthentication no (hanya jika kunci admin sudah terpasang)"
  echo "  - fail2ban untuk sshd"
  echo "  - Batasi IP sumber admin bila memungkinkan"
  exit 0
fi

if [[ "$EUID" -ne 0 ]]; then
  echo "GAGAL: --apply harus dijalankan dengan sudo"
  exit 1
fi

echo "--- [1] Konfirmasi sshd admin di port $ADMIN_SSH_PORT ---"
current_port="$(grep -E '^Port ' /etc/ssh/sshd_config 2>/dev/null | awk '{print $2}' || echo 22)"
if [[ "$current_port" != "$ADMIN_SSH_PORT" ]]; then
  echo "sshd masih Port $current_port — mengubah ke $ADMIN_SSH_PORT"
  if grep -qE '^#?Port ' /etc/ssh/sshd_config; then
    sed -i "s/^#\\?Port .*/Port $ADMIN_SSH_PORT/" /etc/ssh/sshd_config
  else
    echo "Port $ADMIN_SSH_PORT" >> /etc/ssh/sshd_config
  fi
  systemctl restart ssh || systemctl restart sshd
  echo "sshd direstart — UJI ssh -p $ADMIN_SSH_PORT sebelum melanjutkan!"
  sleep 2
fi

echo "--- [2] Firewall ufw (jika aktif) ---"
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "${ADMIN_SSH_PORT}/tcp" comment "PSD admin SSH" || true
  ufw allow 22/tcp comment "PSD Git SSH Gitea" || true
  echo "ufw: port $ADMIN_SSH_PORT dan 22 diizinkan"
else
  echo "SKIP ufw (nonaktif) — buka port di panel idcloudhost manual"
fi

echo "--- [3] Update $ENV_FILE ---"
touch "$ENV_FILE"
if grep -q '^GITEA_SSH_PORT=' "$ENV_FILE"; then
  sed -i "s/^GITEA_SSH_PORT=.*/GITEA_SSH_PORT=$GITEA_SSH_PORT/" "$ENV_FILE"
else
  echo "GITEA_SSH_PORT=$GITEA_SSH_PORT" >> "$ENV_FILE"
fi
if grep -q '^ADMIN_SSH_PORT=' "$ENV_FILE"; then
  sed -i "s/^ADMIN_SSH_PORT=.*/ADMIN_SSH_PORT=$ADMIN_SSH_PORT/" "$ENV_FILE"
else
  echo "ADMIN_SSH_PORT=$ADMIN_SSH_PORT" >> "$ENV_FILE"
fi

echo "--- [4] Restart Gitea (port 22 → kontainer) ---"
cd "$DEPLOY_DIR"
docker compose -f docker-compose.prod.yml up -d gitea backend

echo
echo "=== Selesai Path A ==="
echo "Verifikasi dari laptop:"
echo "  ssh -T git@git.$DOMAIN          # harus sapaan Gitea"
echo "  ssh -p $ADMIN_SSH_PORT \$USER@<ip-vm>  # admin VM"
echo
echo "Jalankan: ./scripts/verify-gitea-ssh.sh"
