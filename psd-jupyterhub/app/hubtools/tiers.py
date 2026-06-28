"""
Batas sumber daya per tier gamifikasi (Langkah 52, sub-langkah 3).

Prinsip strategi: **CPU-only, tanpa GPU** (jangan kejar paritas compute Kaggle).
Batas tier + idle-culling = rem biaya utama. `gpu` SELALU 0.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Limits:
    cpu: float
    mem_gb: float
    start_timeout: int
    max_lifetime_s: int
    gpu: int = 0


TIERS: dict[str, Limits] = {
    "pemula": Limits(cpu=1.0, mem_gb=2, start_timeout=120, max_lifetime_s=2 * 3600),
    "menengah": Limits(cpu=2.0, mem_gb=4, start_timeout=180, max_lifetime_s=4 * 3600),
    "lanjut": Limits(cpu=4.0, mem_gb=8, start_timeout=300, max_lifetime_s=6 * 3600),
}
DEFAULT_TIER = "pemula"


def resolve_limits(tier: str | None) -> Limits:
    return TIERS.get((tier or "").lower(), TIERS[DEFAULT_TIER])
