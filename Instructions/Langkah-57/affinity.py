"""
Profil afinitas kategori/tag dari `activity-summary` (Langkah 35).

Rekomendasi berbasis konten: bobot afinitas pengguna terhadap kategori & tag,
dinormalisasi. `is_cold` menandai pengguna dengan aktivitas terlalu sedikit
(→ fallback popularitas; cegah rekomendasi kosong/buruk).
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class AffinityProfile:
    categories: dict[str, float]
    tags: dict[str, float]
    total: int

    def is_cold(self, min_events: int = 5) -> bool:
        return self.total < min_events


def _normalize(d: dict[str, float]) -> dict[str, float]:
    s = sum(d.values()) or 1.0
    return {k: v / s for k, v in d.items()}


def build_affinity(activity_summary: dict) -> AffinityProfile:
    """activity_summary: {'categories': {cat: count}, 'tags': {tag: count},
    optional 'event_count': int}."""
    cats = dict(activity_summary.get("categories", {}))
    tags = dict(activity_summary.get("tags", {}))
    total = int(activity_summary.get("event_count", sum(cats.values())))
    return AffinityProfile(_normalize(cats), _normalize(tags), total)
