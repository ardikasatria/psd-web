"""Matriks kuota terpusat per (fitur, tier slug)."""
from __future__ import annotations

import time
from typing import Any

from psd_gamification.data import load_manifest


def _tier_slugs() -> list[str]:
    return [t["slug"] for t in load_manifest()["tiers"]]


def _matrix() -> dict[str, dict[str, Any]]:
    return load_manifest()["quota"]


def quota(feature_key: str, tier_slug: str) -> Any:
    row = _matrix()[feature_key]
    slug = (tier_slug or "").lower()
    if slug in row:
        return row[slug]
    return row[_tier_slugs()[0]]


class QuotaExceeded(Exception):
    pass


def validate_matrix() -> list[str]:
    problems: list[str] = []
    slugs = _tier_slugs()
    for key, row in _matrix().items():
        missing = [s for s in slugs if s not in row]
        if missing:
            problems.append(f"{key}: tier hilang {missing}")
    return problems


def check_and_consume(store, feature_key: str, user_id: str, tier_slug: str, *, cost: int = 1) -> dict:
    limit = quota(feature_key, tier_slug)
    if not isinstance(limit, (int, float)):
        raise ValueError(f"{feature_key} bukan kuota numerik.")
    key = f"{feature_key}:{user_id}"
    used = store.incr(key, cost)
    if used > limit:
        store.incr(key, -cost)
        raise QuotaExceeded(f"Kuota '{feature_key}' tier '{tier_slug}' habis ({int(limit)}).")
    return {"used": used, "limit": limit, "remaining": limit - used}


class InMemoryWindowStore:
    def __init__(self, window_s: int = 3600, clock=time.time):
        self.window_s = window_s
        self.clock = clock
        self._data: dict[str, tuple[int, float]] = {}

    def incr(self, key: str, amount: int = 1) -> int:
        now = self.clock()
        count, start = self._data.get(key, (0, now))
        if now - start >= self.window_s:
            count, start = 0, now
        if amount == 0:
            return count
        count += amount
        self._data[key] = (count, start)
        return count
