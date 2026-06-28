"""Seam integrasi — satu pintu penentuan tier dari reputasi."""
from __future__ import annotations

from psd_gamification.tiers import tier_slug_for_reputation


def user_tier_slug_from_reputation(reputation: int) -> str:
    return tier_slug_for_reputation(reputation or 0)
