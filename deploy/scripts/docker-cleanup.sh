#!/usr/bin/env bash
# Bersihkan sisa Docker (image/build cache/container mati) tanpa menghapus volume data.
# Jalankan di VM: cd ~/psd-web/deploy && ./scripts/docker-cleanup.sh
set -euo pipefail

MODE="${1:-safe}"

echo "=== Penggunaan disk (sebelum) ==="
df -h / | tail -1
echo ""
docker system df 2>/dev/null || { echo "Docker tidak tersedia"; exit 1; }
echo ""

case "$MODE" in
  safe)
    echo "=== Mode aman: container/network/build cache + image dangling ==="
    docker container prune -f
    docker network prune -f
    docker builder prune -f
    docker image prune -f
    ;;
  aggressive)
    echo "=== Mode agresif: + semua image yang tidak dipakai container aktif ==="
    echo "    (stack yang sedang jalan tidak terpengaruh; deploy berikutnya akan pull/build ulang)"
    docker container prune -f
    docker network prune -f
    docker builder prune -a -f
    docker image prune -a -f
    ;;
  *)
    echo "Pemakaian: $0 [safe|aggressive]"
    echo "  safe        — default, paling aman"
    echo "  aggressive  — lebih banyak ruang, hapus image lama tidak terpakai"
    echo ""
    echo "JANGAN jalankan: docker volume prune / docker system prune --volumes"
    echo "Volume data PSD (pgdata, miniodata, giteadata, …) bisa terhapus."
    exit 1
    ;;
esac

echo ""
echo "=== Penggunaan disk (sesudah) ==="
df -h / | tail -1
echo ""
docker system df
