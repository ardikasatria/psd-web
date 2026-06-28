"""Perolehan reputasi per aktivitas."""
from __future__ import annotations

from psd_gamification.data import load_manifest


def reputation_points() -> dict[str, int]:
    return dict(load_manifest()["reputation_points"])


def award(reason: str) -> int:
    return reputation_points().get(reason, 0)
