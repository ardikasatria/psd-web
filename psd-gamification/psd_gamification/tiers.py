"""Definisi tier kanonik (5 level) — reputasi → tier."""
from __future__ import annotations

from dataclasses import dataclass

from psd_gamification.data import load_manifest
from psd_gamification.quota import quota


@dataclass(frozen=True)
class TierDef:
    slug: str
    label: str
    level: int
    min_reputation: int
    badge_file: str


def _tiers() -> list[TierDef]:
    return [TierDef(**row) for row in load_manifest()["tiers"]]


def tier_slugs() -> list[str]:
    return [t.slug for t in _tiers()]


def tier_labels() -> list[str]:
    return [t.label for t in _tiers()]


def badge_files() -> list[str]:
    return [t.badge_file for t in _tiers()]


def _tier_by_slug(slug: str) -> TierDef:
    key = (slug or "").lower()
    for t in _tiers():
        if t.slug == key:
            return t
    return _tiers()[0]


def tier_slug_for_level(level: int) -> str:
    tiers = _tiers()
    idx = min(max(level, 0), len(tiers) - 1)
    return tiers[idx].slug


def tier_label_for_slug(slug: str) -> str:
    return _tier_by_slug(slug).label


def tier_for_reputation(rep: int) -> dict:
    """Tier tertinggi yang ambang reputasinya <= rep."""
    chosen = _tiers()[0]
    for t in _tiers():
        if rep >= t.min_reputation:
            chosen = t
    next_tier = next((t for t in _tiers() if t.level == chosen.level + 1), None)
    return {
        "level": chosen.level,
        "slug": chosen.slug,
        "name": chosen.label,
        "reputation": rep,
        "next_at": next_tier.min_reputation if next_tier else None,
    }


def tier_slug_for_reputation(rep: int) -> str:
    return tier_for_reputation(rep)["slug"]


def perks_for_reputation(rep: int) -> dict:
    """Hak platform per tier reputasi."""
    info = tier_for_reputation(rep)
    slug = info["slug"]
    level = info["level"]
    return {
        "upload_max_mb": int(quota("platform.upload_max_mb", slug)),
        "daily_submission_bonus": int(quota("platform.daily_submission_bonus", slug)),
        "notebook_quota": int(quota("platform.notebook_quota", slug)),
        "event_priority": level >= 2,
        "can_create_event": level >= 3,
        "daily_post_limit": int(quota("platform.daily_post_limit", slug)),
        "post_image_max": int(quota("platform.post_image_max", slug)),
    }


def reputation_to_next(rep: int) -> int | None:
    info = tier_for_reputation(rep)
    if info["next_at"] is None:
        return None
    return max(0, info["next_at"] - rep)
