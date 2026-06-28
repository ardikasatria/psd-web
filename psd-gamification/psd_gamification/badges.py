"""Definisi badge pencapaian (bukan tier level)."""
from __future__ import annotations

from psd_gamification.data import load_manifest


def achievement_badges() -> dict[str, tuple[str, str, str]]:
    raw = load_manifest()["achievement_badges"]
    return {bid: (meta["name"], meta["tier"], meta["description"]) for bid, meta in raw.items()}
