#!/usr/bin/env bash
# Verifikasi endpoint Fase 0 (modul 38–47 + Transformer hub).
# Jalankan setelah deploy + seed pilot.
set -euo pipefail
cd "$(dirname "$0")/.."

LOCAL=false
for arg in "$@"; do
  case "$arg" in
    --local) LOCAL=true ;;
    -h|--help)
      echo "Usage: $0 [--local]"
      exit 0
      ;;
  esac
done

if $LOCAL; then
  ENV_FILE=.env.local
  [[ -f "${ENV_FILE}" ]] || { echo "deploy/.env.local belum ada."; exit 1; }
  set -a
  # shellcheck disable=SC1091
  source "${ENV_FILE}"
  set +a
  API="http://${VM_IP:-localhost}:8000/api/v1"
else
  [[ -f .env ]] || { echo "deploy/.env belum ada."; exit 1; }
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
  API="https://api.${DOMAIN}/api/v1"
fi

check_json() {
  local name="$1" url="$2" needle="${3:-}"
  local body
  if ! body=$(curl -fsS --max-time 20 "$url"); then
    echo "  FAIL ${name} (${url})"
    return 1
  fi
  if [[ -n "${needle}" ]] && ! echo "$body" | grep -q "${needle}"; then
    echo "  FAIL ${name} — respons tidak mengandung '${needle}'"
    return 1
  fi
  echo "  OK  ${name}"
}

echo "Verifikasi Fase 0 — API=${API}"
fail=0

check_json "Hub Transformer" "${API}/hub/transformer" "collections" || fail=1
check_json "Kategori" "${API}/categories" "slug" || fail=1
check_json "Kursus" "${API}/courses?page_size=1" "items" || fail=1
check_json "Kompetisi" "${API}/competitions?page_size=1" "items" || fail=1
check_json "Event" "${API}/events?page_size=1" "items" || fail=1
check_json "Notebook" "${API}/notebooks?page_size=1" "items" || fail=1

echo ""
echo "Endpoint auth (butuh login manual / smoke E2E):"
echo "  GET ${API}/me/factory/quota"
echo "  GET ${API}/me/dashboards"
echo "  POST ${API}/pipelines/{slug}/run"

if [[ $fail -eq 0 ]]; then
  echo ""
  echo "Semua cek publik lulus. Lanjut E2E manual: Instructions/PSD_Checklist_Kesiapan_Rilis.md §6"
else
  echo ""
  echo "Beberapa cek gagal — pastikan --seed sudah dijalankan atau data produksi ada."
fi

exit $fail
