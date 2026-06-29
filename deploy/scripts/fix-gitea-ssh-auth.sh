#!/usr/bin/env bash
# Perbaikan cepat: AuthorizedKeysCommand gagal status 1 karena docker exec tanpa -u git.
# Jalankan setelah git pull jika ssh masih Permission denied padahal kunci sudah terdaftar.
#
#   sudo ./scripts/fix-gitea-ssh-auth.sh
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec sudo "$SCRIPT_DIR/setup-gitea-ssh-passthrough.sh" --apply
