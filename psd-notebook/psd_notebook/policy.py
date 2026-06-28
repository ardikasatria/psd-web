"""Kebijakan & kuota notebook per tier gamifikasi (5 tier kanonik)."""
from __future__ import annotations

from dataclasses import dataclass

from psd_gamification.quota import quota

DEFAULT_TIER = "pemula"


@dataclass(frozen=True)
class NotebookLimits:
    max_notebooks: int
    max_concurrent_kernels: int
    runtime: str
    cpu: float
    mem_gb: float


class NotebookQuotaError(Exception):
    pass


def limits_for(tier: str | None) -> NotebookLimits:
    slug = (tier or DEFAULT_TIER).lower()
    rt = str(quota("notebook.runtime", slug))
    return NotebookLimits(
        max_notebooks=int(quota("notebook.max_notebooks", slug)),
        max_concurrent_kernels=int(quota("notebook.max_concurrent_kernels", slug)),
        runtime=rt,
        cpu=float(quota("jupyter.cpu", slug)),
        mem_gb=float(quota("jupyter.mem_gb", slug)),
    )


def check_can_create(tier: str, current_count: int) -> None:
    lim = limits_for(tier)
    if current_count >= lim.max_notebooks:
        raise NotebookQuotaError(
            f"Batas notebook tier '{tier}' tercapai ({lim.max_notebooks}). "
            f"Naikkan tier dengan poin gamifikasi untuk menambah."
        )


def check_can_start_kernel(tier: str, running_count: int) -> None:
    lim = limits_for(tier)
    if running_count >= lim.max_concurrent_kernels:
        raise NotebookQuotaError(
            f"Batas kernel berjalan tier '{tier}' tercapai "
            f"({lim.max_concurrent_kernels}). Hentikan satu sesi atau naikkan tier."
        )
