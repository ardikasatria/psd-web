#!/usr/bin/env bash
# Path B — SSH passthrough: port 22 host tetap sshd admin; user `git` diteruskan ke Gitea.
# Metode: Gitea AuthorizedKeysCommand + docker-shell (docs.gitea.com).
#
#   sudo ./scripts/setup-gitea-ssh-passthrough.sh --check
#   sudo ./scripts/setup-gitea-ssh-passthrough.sh --apply
#   sudo ./scripts/setup-gitea-ssh-passthrough.sh --rollback
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"
COMPOSE=(docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml")
PASSTHROUGH_COMPOSE=(docker compose -f "$DEPLOY_DIR/docker-compose.prod.yml" -f "$DEPLOY_DIR/docker-compose.gitea-passthrough.yml")

HOST_GIT_USER="${HOST_GIT_USER:-git}"
DOCKER_SHELL="/home/${HOST_GIT_USER}/docker-shell"
AUTH_SCRIPT="/usr/local/bin/psd-gitea-authorized-keys"
SSHD_MARKER_BEGIN="# --- PSD Gitea SSH Passthrough (begin) ---"
SSHD_MARKER_END="# --- PSD Gitea SSH Passthrough (end) ---"
MARK_TAG="psd-gitea-authorized-keys"
SSHD_CONFIG="/etc/ssh/sshd_config"
MODE="${1:-}"

usage() {
  head -n 12 "$0" | tail -n +2
  exit 1
}

[[ "$MODE" == "--check" || "$MODE" == "--apply" || "$MODE" == "--rollback" ]] || usage

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1091
  source "$ENV_FILE"
fi
DOMAIN="${DOMAIN:-projeksainsdata.com}"

resolve_gitea_container() {
  local id name compose=("${COMPOSE[@]}")
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1091
    source "$ENV_FILE"
    if [[ "${GITEA_SSH_MODE:-}" == "passthrough" ]]; then
      compose=("${PASSTHROUGH_COMPOSE[@]}")
    fi
  fi
  id="$("${compose[@]}" ps -q gitea 2>/dev/null | head -1 || true)"
  if [[ -z "$id" ]]; then
    echo "psd-gitea"
    return
  fi
  name="$(docker inspect --format '{{.Name}}' "$id" 2>/dev/null | sed 's|^/||' || true)"
  echo "${name:-psd-gitea}"
}

resolve_gitea_bin() {
  local bin
  bin="$(docker exec "$GITEA_CONTAINER" sh -c 'command -v gitea 2>/dev/null || echo /usr/local/bin/gitea' 2>/dev/null || echo /usr/local/bin/gitea)"
  echo "$bin"
}

GITEA_CONTAINER="$(resolve_gitea_container)"
GITEA_BIN="$(resolve_gitea_bin)"

remove_sshd_block() {
  if [[ ! -f "$SSHD_CONFIG" ]]; then
    return
  fi
  awk -v b="$SSHD_MARKER_BEGIN" -v e="$SSHD_MARKER_END" '
    $0 == b { skip=1; next }
    $0 == e { skip=0; next }
    !skip { print }
  ' "$SSHD_CONFIG" > "${SSHD_CONFIG}.tmp" && mv "${SSHD_CONFIG}.tmp" "$SSHD_CONFIG"
}

write_auth_script() {
  GITEA_BIN="$(resolve_gitea_bin)"
  cat > "$AUTH_SCRIPT" <<EOF
#!/bin/sh
# ${MARK_TAG}
# Wajib -u git: gitea menolak dijalankan sebagai root di kontainer (docs.gitea.com)
exec /usr/bin/docker exec -i -u git ${GITEA_CONTAINER} ${GITEA_BIN} keys -e git -u "\$1" -t "\$2" -k "\$3"
EOF
  chmod 755 "$AUTH_SCRIPT"
  chown root:root "$AUTH_SCRIPT"
}

write_docker_shell() {
  mkdir -p "/home/${HOST_GIT_USER}"
  cat > "$DOCKER_SHELL" <<EOF
#!/bin/sh
exec /usr/bin/docker exec -i -u git --env SSH_ORIGINAL_COMMAND="\$SSH_ORIGINAL_COMMAND" ${GITEA_CONTAINER} sh "\$@"
EOF
  chmod 755 "$DOCKER_SHELL"
  chown "${HOST_GIT_USER}:${HOST_GIT_USER}" "$DOCKER_SHELL" 2>/dev/null || true
}

ensure_git_user() {
  if ! id "$HOST_GIT_USER" &>/dev/null; then
    useradd --system --create-home --home-dir "/home/${HOST_GIT_USER}" \
      --shell "$DOCKER_SHELL" --comment "Gitea SSH passthrough" "$HOST_GIT_USER"
  else
    usermod -d "/home/${HOST_GIT_USER}" -s "$DOCKER_SHELL" "$HOST_GIT_USER" 2>/dev/null || true
  fi
  if getent group docker >/dev/null; then
    usermod -aG docker "$HOST_GIT_USER" 2>/dev/null || true
  fi
}

append_sshd_block() {
  remove_sshd_block
  cat >> "$SSHD_CONFIG" <<EOF

$SSHD_MARKER_BEGIN
Match User ${HOST_GIT_USER}
    # ${MARK_TAG}
    AuthorizedKeysCommandUser ${HOST_GIT_USER}
    AuthorizedKeysCommand ${AUTH_SCRIPT} %u %t %k
    PasswordAuthentication no
    Banner none
$SSHD_MARKER_END
EOF
}

update_env_passthrough() {
  touch "$ENV_FILE"
  for kv in \
    "GITEA_SSH_MODE=passthrough" \
    "GITEA_SSH_PORT=22" \
    "GITEA_SSH_PUBLISH=127.0.0.1:2222:2222"
  do
    key="${kv%%=*}"
    if grep -q "^${key}=" "$ENV_FILE"; then
      sed -i "s|^${key}=.*|${kv}|" "$ENV_FILE"
    else
      echo "$kv" >> "$ENV_FILE"
    fi
  done
}

echo "=== Gitea SSH Passthrough (Path B) ==="
echo "Git (mahasiswa): ssh -T git@git.${DOMAIN}  (port 22, user git → Gitea)"
echo "Admin:           ssh ${USER}@<ip-vm>       (port 22, user admin → shell VM)"
echo "Kontainer Gitea: ${GITEA_CONTAINER} (binary: ${GITEA_BIN})"
echo

if [[ "$MODE" == "--rollback" ]]; then
  [[ "$EUID" -eq 0 ]] || { echo "Butuh sudo"; exit 1; }
  remove_sshd_block
  systemctl restart ssh 2>/dev/null || systemctl restart sshd
  if grep -q '^GITEA_SSH_MODE=passthrough' "$ENV_FILE" 2>/dev/null; then
    sed -i 's/^GITEA_SSH_MODE=.*/GITEA_SSH_MODE=interim/' "$ENV_FILE"
    sed -i 's/^GITEA_SSH_PORT=.*/GITEA_SSH_PORT=2222/' "$ENV_FILE"
    sed -i 's/^GITEA_SSH_PUBLISH=.*/GITEA_SSH_PUBLISH=2222:2222/' "$ENV_FILE"
  fi
  cd "$DEPLOY_DIR"
  "${COMPOSE[@]}" up -d gitea backend
  echo "Rollback selesai — pertimbangkan Path C (port 2222) + buka firewall."
  exit 0
fi

echo "--- Prasyarat ---"
issues=0
command -v docker >/dev/null || { echo "GAGAL: docker tidak ada"; issues=$((issues + 1)); }
[[ -f "$DEPLOY_DIR/docker-compose.prod.yml" ]] || { echo "GAGAL: compose tidak ada"; issues=$((issues + 1)); }
if ! "${COMPOSE[@]}" ps gitea 2>/dev/null | grep -q "Up"; then
  echo "PERINGATAN: kontainer gitea belum Up — jalankan docker compose up -d gitea dulu"
fi
[[ "$issues" -gt 0 ]] && exit 1

if [[ "$MODE" == "--check" ]]; then
  echo "OK: prasyarat dasar terpenuhi"
  echo
  echo "Yang akan dikonfigurasi (--apply):"
  echo "  1. User sistem '${HOST_GIT_USER}' + ${DOCKER_SHELL}"
  echo "  2. ${AUTH_SCRIPT} → docker exec ${GITEA_CONTAINER} gitea keys …"
  echo "  3. Blok Match User ${HOST_GIT_USER} di ${SSHD_CONFIG}"
  echo "  4. .env: GITEA_SSH_MODE=passthrough, GITEA_SSH_PORT=22"
  echo "  5. compose passthrough (Gitea SSH hanya 127.0.0.1:2222)"
  echo
  echo "Setelah apply, dari laptop:"
  echo "  ssh -T git@git.${DOMAIN}"
  echo "  (admin tetap: ssh <user>@<ip> tanpa perubahan port)"
  exit 0
fi

[[ "$EUID" -eq 0 ]] || { echo "GAGAL: --apply butuh sudo"; exit 1; }

cp -a "$SSHD_CONFIG" "${SSHD_CONFIG}.bak.psd-passthrough.$(date +%Y%m%d%H%M)" 2>/dev/null || true

write_auth_script
write_docker_shell
ensure_git_user
append_sshd_block

if sshd -t 2>/dev/null; then
  systemctl restart ssh 2>/dev/null || systemctl restart sshd
else
  echo "GAGAL: sshd -t gagal — restore backup ${SSHD_CONFIG}.bak.*"
  exit 1
fi

update_env_passthrough
cd "$DEPLOY_DIR"
"${PASSTHROUGH_COMPOSE[@]}" up -d gitea backend

sleep 3
if ! "${PASSTHROUGH_COMPOSE[@]}" ps gitea 2>/dev/null | grep -q "Up"; then
  echo "GAGAL: kontainer gitea tidak Up — kemungkinan bentrok port. Cek:"
  echo "  ${PASSTHROUGH_COMPOSE[*]} logs gitea --tail 40"
  echo "Pastikan .env punya GITEA_SSH_PUBLISH=127.0.0.1:2222:2222 (listen kontainer :2222)"
  exit 1
fi

echo
echo "=== Passthrough aktif ==="
echo "Diagnosa lengkap (dengan kunci laptop):"
echo "  sudo ./scripts/diagnose-gitea-ssh.sh --pubkey \"\$(cat ~/.ssh/id_ed25519.pub)\""
echo
echo "Uji dari laptop:"
echo "  ssh -T git@git.${DOMAIN}"
echo
echo "Daftarkan kunci manual (uji Kasus A):"
echo "  ./scripts/register-gitea-ssh-key.sh <username> \"\$(cat ~/.ssh/id_ed25519.pub)\""
echo
echo "Admin infra tetap: ssh <user>@<ip-vm>"
