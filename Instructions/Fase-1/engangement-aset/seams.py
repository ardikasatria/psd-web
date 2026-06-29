"""
==========================================================================
 TITIK INTEGRASI (SEAM) — engagement
==========================================================================
"""
from __future__ import annotations


class EngagementStore:
    """Penyimpanan counter aset, status suka, & ringkasan pengguna (DB PSD)."""
    def has_loved(self, actor_id: str, asset_key: str) -> bool:
        raise NotImplementedError

    def set_loved(self, actor_id: str, asset_key: str, loved: bool) -> None:
        raise NotImplementedError

    def get_asset(self, asset_key: str):       # -> AssetCounters
        raise NotImplementedError

    def save_asset(self, asset_key: str, asset) -> None:
        raise NotImplementedError

    def get_summary(self, user_id: str):       # -> UserSummary
        raise NotImplementedError

    def save_summary(self, user_id: str, summary) -> None:
        raise NotImplementedError

    # opsional anti-spam berbagi
    def shared_today(self, actor_id: str, asset_key: str, channel: str) -> bool:
        return False

    def mark_shared_today(self, actor_id: str, asset_key: str, channel: str) -> None:
        ...


class Gamification:
    """Hook ke Langkah 25 (reputasi/badge)."""
    def award(self, user_id: str, reason: str) -> None:
        raise NotImplementedError

    def badge(self, user_id: str, badge_id: str) -> None:
        raise NotImplementedError
