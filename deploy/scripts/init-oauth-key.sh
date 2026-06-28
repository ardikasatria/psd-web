#!/usr/bin/env bash
# Buat kunci RSA OIDC untuk produksi (sekali). Dipanggil init-env.sh atau manual saat upgrade Langkah 48.
set -euo pipefail
cd "$(dirname "$0")/.."

mkdir -p secrets
KEY=secrets/psd_oidc.pem

if [[ -f "${KEY}" ]]; then
  echo "Kunci OIDC sudah ada: ${KEY}"
  exit 0
fi

openssl genrsa -out "${KEY}" 2048
chmod 600 "${KEY}"
echo "Kunci OIDC dibuat: ${KEY}"
echo "File ini di-mount ke backend saat deploy produksi (jangan commit)."
