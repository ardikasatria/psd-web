"""
Definisi TIER kanonik (sumber kebenaran tunggal gamifikasi PSD).

Semua fitur (notebook, JupyterHub, serving, AI asisten) HARUS memakai modul ini —
jangan mendefinisikan tier/kuota sendiri-sendiri (cegah angka melenceng).

Tier ditentukan dari POIN (lihat points.py). Naik tier = lewati ambang poin.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Tier:
    name: str
    min_points: int
    rank: int


# Urut menaik berdasarkan min_points. Sesuaikan ambang dengan kebijakan PSD.
TIERS: list[Tier] = [
    Tier("pemula", 0, 0),
    Tier("menengah", 500, 1),
    Tier("lanjut", 2000, 2),
]
TIER_NAMES = [t.name for t in TIERS]
DEFAULT_TIER = TIERS[0].name


def _by_name(name: str) -> Tier:
    for t in TIERS:
        if t.name == (name or "").lower():
            return t
    return TIERS[0]


def tier_for_points(points: int) -> str:
    """Tier tertinggi yang ambang poinnya <= points."""
    chosen = TIERS[0]
    for t in TIERS:
        if points >= t.min_points:
            chosen = t
    return chosen.name


def tier_rank(name: str) -> int:
    return _by_name(name).rank


def next_tier(name: str) -> Tier | None:
    r = _by_name(name).rank
    nxt = [t for t in TIERS if t.rank == r + 1]
    return nxt[0] if nxt else None


def points_to_next(points: int) -> int | None:
    """Sisa poin untuk naik tier; None bila sudah tertinggi."""
    cur = tier_for_points(points)
    nt = next_tier(cur)
    return None if nt is None else max(0, nt.min_points - points)
