#!/usr/bin/env bash
# Daftarkan kunci SSH ke Gitea via admin API (uji Kasus A / bypass PSD sementara).
# Usage:
#   ./scripts/register-gitea-ssh-key.sh ardikasatria "$(cat ~/.ssh/id_ed25519.pub)"
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$DEPLOY_DIR/.env"

USERNAME="${1:-}"
PUBKEY="${2:-}"
TITLE="${3:-laptop-$(date +%Y%m%d)}"

if [[ -z "$USERNAME" || -z "$PUBKEY" ]]; then
  echo "Usage: $0 <username-gitea> \"<ssh-publik-lengkap>\" [judul]"
  exit 1
fi

[[ -f "$ENV_FILE" ]] && { # shellcheck disable=SC1091
  source "$ENV_FILE"; }

DOMAIN="${DOMAIN:-projeksainsdata.com}"
TOKEN="${GITEA_ADMIN_TOKEN:-}"
GIT_HOST="git.${DOMAIN}"

if [[ -z "$TOKEN" ]]; then
  echo "GAGAL: GITEA_ADMIN_TOKEN kosong di $ENV_FILE"
  exit 1
fi

echo "Mendaftarkan kunci untuk user Gitea: $USERNAME"

code="$(python3 - "$GIT_HOST" "$TOKEN" "$USERNAME" "$TITLE" "$PUBKEY" <<'PY'
import json, sys, urllib.request

host, token, user, title, pubkey = sys.argv[1:6]
url = f"https://{host}/api/v1/admin/users/{user}/keys"
body = json.dumps({"title": title, "key": pubkey, "read_only": False}).encode()
req = urllib.request.Request(
    url, data=body, method="POST",
    headers={"Authorization": f"token {token}", "Content-Type": "application/json"},
)
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print(r.status)
        print(r.read().decode()[:500])
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.read().decode()[:500])
PY
)"

http_code="$(echo "$code" | head -1)"
body="$(echo "$code" | tail -n +2)"
echo "HTTP $http_code"
echo "$body"

if [[ "$http_code" == "201" ]]; then
  echo "OK — uji dari laptop: ssh -T git@${GIT_HOST}"
else
  echo "Gagal — cek token & username. List kunci existing:"
  curl -fsS -H "Authorization: token ${TOKEN}" \
    "https://${GIT_HOST}/api/v1/users/${USERNAME}/keys" 2>/dev/null | head -c 400 || true
  echo
fi
