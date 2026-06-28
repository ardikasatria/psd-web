#!/usr/bin/env bash
# Build image JupyterHub + single-user (Langkah 52). Jalankan dari deploy/
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
echo "Building psd-singleuser:latest ..."
docker build -f "$ROOT/psd-jupyterhub/docker/Dockerfile.singleuser" -t psd-singleuser:latest "$ROOT/psd-jupyterhub"
echo "Done. Hub image dibangun via docker compose build jupyterhub."
