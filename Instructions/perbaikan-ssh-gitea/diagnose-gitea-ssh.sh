#!/usr/bin/env bash
# Diagnosa & perbaikan SSH Gitea Path B (passthrough).
# Menemukan kenapa `ssh -T git@git.<domain>` masih "Permission denied (publickey)"
# dan (opsional) menyembunyikan banner idcloudhost untuk user git.
#
#   sudo ./scripts/diagnose-gitea-ssh.sh
#   sudo ./scripts/diagnose-gitea-ssh.sh --pubkey "ssh-ed25519 AAAA... budi@itera"
#   sudo ./scripts/diagnose-gitea-ssh.sh --fix-banner
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
COMPOSE=(docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml")

HOST_GIT_USER="${HOST_GIT_USER:-git}"
AUTH_SCRIPT="/usr/local/bin/psd-gitea-authorized-keys"
DOCKER_SHELL="/home/${HOST_GIT_USER}/docker-shell"
SSHD_CONFIG="/etc/ssh/sshd_config"
MARK_TAG="psd-gitea-authorized-keys"

PUBKEY=""
FIX_BANNER=0
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pubkey) PUBKEY="${2:-}"; shift 2 ;;
    --fix-banner) FIX_BANNER=1; shift ;;
    *) echo "Argumen tak dikenal: $1"; exit 1 ;;
  esac
done

[[ -f "$ENV_FILE" ]] && { # shellcheck disable=SC1091
  source "$ENV_FILE"; }
DOMAIN="${DOMAIN:-projeksainsdata.com}"

resolve_gitea_container() {
  local id name
  id="$("${COMPOSE[@]}" ps -q gitea 2>/dev/null | head -1 || true)"
  [[ -z "$id" ]] && { echo "psd-gitea"; return; }
  name="$(docker inspect --format '{{.Name}}' "$id" 2>/dev/null | sed 's|^/||' || true)"
  echo "${name:-psd-gitea}"
}
GITEA="$(resolve_gitea_container)"

pass() { echo "  OK  : $*"; }
warn() { echo "  WARN: $*"; }
fail() { echo "  GAGAL: $*"; }

echo "=== Diagnosa SSH Gitea (Path B) — kontainer: $GITEA ==="
echo

echo "--- [1] User host '$HOST_GIT_USER' & shell ---"
if id "$HOST_GIT_USER" &>/dev/null; then
  shell="$(getent passwd "$HOST_GIT_USER" | cut -d: -f7)"
  pass "user ada, shell=$shell"
  [[ "$shell" == "$DOCKER_SHELL" ]] || warn "shell bukan $DOCKER_SHELL"
  id "$HOST_GIT_USER" | grep -q 'docker' && pass "user di grup docker" || fail "user TIDAK di grup docker (perlu untuk docker exec)"
else
  fail "user $HOST_GIT_USER tidak ada"
fi
echo

echo "--- [2] Izin AuthorizedKeysCommand ---"
if [[ -f "$AUTH_SCRIPT" ]]; then
  perm="$(stat -c '%U %G %a' "$AUTH_SCRIPT")"
  pass "$AUTH_SCRIPT ($perm)"
  [[ "$perm" == "root root 755" || "$perm" == "root root 750" ]] || warn "idealnya root root 755 (sshd menolak bila writable grup/lainnya)"
else
  fail "$AUTH_SCRIPT tidak ada"
fi
[[ -x "$DOCKER_SHELL" ]] && pass "$DOCKER_SHELL ada" || warn "$DOCKER_SHELL tidak ada/executable"
echo

echo "--- [3] Binary gitea & perintah keys di kontainer ---"
if docker exec "$GITEA" sh -c 'command -v gitea' >/dev/null 2>&1; then
  gpath="$(docker exec "$GITEA" sh -c 'command -v gitea')"
  pass "gitea ditemukan di kontainer: $gpath"
else
  fail "binary gitea tidak ditemukan di kontainer (AuthorizedKeysCommand akan gagal)"
fi
echo

echo "--- [4] Konfigurasi efektif sshd untuk user git ---"
if command -v sshd >/dev/null; then
  sshd -T -C user="$HOST_GIT_USER",host=localhost,addr=127.0.0.1 2>/dev/null \
    | grep -iE 'authorizedkeyscommand|passwordauthentication|pubkeyauthentication|banner' \
    | sed 's/^/  /' || warn "tak bisa membaca sshd -T"
else
  warn "sshd tidak di PATH"
fi
echo

echo "--- [5] Uji rantai auth dengan kunci (jika --pubkey diberikan) ---"
if [[ -n "$PUBKEY" ]]; then
  typ="$(awk '{print $1}' <<<"$PUBKEY")"
  b64="$(awk '{print $2}' <<<"$PUBKEY")"
  if [[ -z "$typ" || -z "$b64" ]]; then
    fail "format --pubkey salah (harus: '<type> <base64> [komentar]')"
  else
    echo "  Tipe: $typ"
    echo "  a) Apakah kunci terdaftar di Gitea? (gitea keys)"
    klines="$(docker exec "$GITEA" gitea keys -e "$HOST_GIT_USER" -u "$HOST_GIT_USER" -t "$typ" -k "$b64" 2>&1 || true)"
    if grep -q 'serv' <<<"$klines"; then
      pass "kunci TERDAFTAR di Gitea — Gitea mengembalikan baris authorized_keys"
    else
      fail "kunci TIDAK terdaftar di Gitea (atau gitea keys error):"
      echo "$klines" | sed 's/^/      /'
      echo "      → Inilah penyebab Permission denied. Daftarkan kunci ke Gitea (lihat panduan)."
    fi
    echo "  b) Apakah AuthorizedKeysCommand mengembalikan baris yang sama (via user git)?"
    out="$(sudo -u "$HOST_GIT_USER" "$AUTH_SCRIPT" "$HOST_GIT_USER" "$typ" "$b64" 2>&1 || true)"
    if grep -q 'serv' <<<"$out"; then
      pass "AuthorizedKeysCommand OK (rantai host→kontainer berfungsi)"
    else
      fail "AuthorizedKeysCommand tak mengembalikan kunci (cek docker/izin):"
      echo "$out" | sed 's/^/      /'
    fi
  fi
else
  warn "lewati — beri --pubkey \"\$(pbpaste)\" atau isi kunci publik laptopmu untuk uji penuh"
fi
echo

echo "--- [6] Log autentikasi terbaru (petunjuk) ---"
if [[ -r /var/log/auth.log ]]; then
  grep -iE "sshd.*(AuthorizedKeysCommand|Accepted|Failed|refused).*git" /var/log/auth.log 2>/dev/null | tail -5 | sed 's/^/  /' || true
else
  journalctl -u ssh -n 80 --no-pager 2>/dev/null | grep -iE 'AuthorizedKeysCommand|Accepted|Failed|refused' | tail -5 | sed 's/^/  /' || warn "tak bisa baca log"
fi
echo

if [[ "$FIX_BANNER" -eq 1 ]]; then
  echo "--- [7] Sembunyikan banner idcloudhost untuk user git ---"
  [[ "$EUID" -eq 0 ]] || { fail "--fix-banner butuh sudo"; exit 1; }
  if grep -q "$MARK_TAG" "$SSHD_CONFIG"; then
    if grep -A3 "$MARK_TAG" "$SSHD_CONFIG" | grep -qi 'Banner none'; then
      pass "'Banner none' sudah ada di blok git"
    else
      cp -a "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.banner.$(date +%Y%m%d%H%M)"
      sed -i "/$MARK_TAG/a\\    Banner none" "$SSHD_CONFIG"
      if sshd -t 2>/dev/null; then
        systemctl restart ssh 2>/dev/null || systemctl restart sshd
        pass "'Banner none' ditambahkan ke blok Match User git; sshd direstart"
      else
        fail "sshd -t gagal — kembalikan dari ${SSHD_CONFIG}.bak.banner.*"
        exit 1
      fi
    fi
  else
    fail "blok passthrough ($MARK_TAG) tak ditemukan di $SSHD_CONFIG — jalankan setup-gitea-ssh-passthrough.sh --apply dulu"
  fi
  echo
fi

echo "=== Langkah uji setelah perbaikan ==="
echo "  Dari LAPTOP (bukan VM):"
echo "    ssh -vT git@git.$DOMAIN"
echo "  Sukses bila muncul: 'Hi <username>! You've successfully authenticated ...'"
echo "  (banner idcloudhost hilang bila --fix-banner dijalankan)"
