#!/usr/bin/env bash
# Seeding pilot Fase 0 — urutan sesuai PSD_Checklist_Kesiapan_Rilis.md §4:
#   1. app.seed        — data demo dasar (users, repos, courses, …)
#   2. app.seed_content — akun psd, kategori Transformer, quests, micro, koleksi
#   3. app.reindex     — Meilisearch
#
# Dipanggil dari deploy.sh / deploy-local.sh (--seed).
set -euo pipefail

COMPOSE_FILE="${1:?compose file required}"
ENV_FILE="${2:-}"

compose() {
  if [[ -n "${ENV_FILE}" ]]; then
    docker compose -f "${COMPOSE_FILE}" --env-file "${ENV_FILE}" "$@"
  else
    docker compose -f "${COMPOSE_FILE}" "$@"
  fi
}

run_seed() {
  local mod="$1"
  echo "==> python -m app.${mod}"
  compose exec -T backend python -m "app.${mod}"
}

echo "==> Seed pilot Fase 0"
run_seed seed
run_seed seed_content
run_seed reindex
echo "==> Seed pilot selesai."
