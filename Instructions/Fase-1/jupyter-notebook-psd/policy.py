"""
Kebijakan & kuota notebook per tier gamifikasi (revisi Langkah 52 — notebook terintegrasi).

Dua batas utama (jawaban "dibatasi berapa notebook"):
  - max_notebooks         : jumlah notebook yang boleh dimiliki.
  - max_concurrent_kernels: kernel berjalan bersamaan (rem biaya compute).

Runtime per tier (strategi hybrid, rem biaya):
  - "browser" : JupyterLite (Pyodide) — jalan di browser, BIAYA SERVER ~NOL.
  - "server"  : kernel server (Jupyter), butuh sumber daya → di-gate ketat.
  - "both"    : pengguna boleh pilih.
CPU-only (tanpa GPU) — konsisten strategi.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class NotebookLimits:
    max_notebooks: int
    max_concurrent_kernels: int
    runtime: str          # "browser" | "server" | "both"
    cpu: float            # untuk kernel server
    mem_gb: float


# Tier rendah = browser-only (gratis). Tier naik = buka kernel server + kuota lebih besar.
TIERS: dict[str, NotebookLimits] = {
    "pemula":   NotebookLimits(max_notebooks=3,  max_concurrent_kernels=1, runtime="browser", cpu=1, mem_gb=2),
    "menengah": NotebookLimits(max_notebooks=10, max_concurrent_kernels=2, runtime="both",    cpu=2, mem_gb=4),
    "lanjut":   NotebookLimits(max_notebooks=50, max_concurrent_kernels=4, runtime="both",    cpu=4, mem_gb=8),
}
DEFAULT_TIER = "pemula"


class NotebookQuotaError(Exception):
    pass


def limits_for(tier: str | None) -> NotebookLimits:
    return TIERS.get((tier or "").lower(), TIERS[DEFAULT_TIER])


def check_can_create(tier: str, current_count: int) -> None:
    lim = limits_for(tier)
    if current_count >= lim.max_notebooks:
        raise NotebookQuotaError(
            f"Batas notebook tier '{tier}' tercapai ({lim.max_notebooks}). "
            f"Naikkan tier dengan poin gamifikasi untuk menambah.")


def check_can_start_kernel(tier: str, running_count: int) -> None:
    lim = limits_for(tier)
    if running_count >= lim.max_concurrent_kernels:
        raise NotebookQuotaError(
            f"Batas kernel berjalan tier '{tier}' tercapai "
            f"({lim.max_concurrent_kernels}). Hentikan satu sesi atau naikkan tier.")
