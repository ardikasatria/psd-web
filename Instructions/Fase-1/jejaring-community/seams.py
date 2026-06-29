"""
==========================================================================
 TITIK INTEGRASI (SEAM) — penemuan komunitas
==========================================================================
Sediakan pool kandidat (hasil query DB) ke panels.build_discovery.
"""
from __future__ import annotations


def top_tier_pool(db, limit: int):
    """Pengguna urut reputasi desc (Langkah 25)."""
    raise NotImplementedError


def popular_pool(db, limit: int):
    """Pengguna dengan follower_count/post_like_total tertinggi (Langkah 24/25)."""
    raise NotImplementedError


def new_members_pool(db, days: int, limit: int):
    """Pengguna terbaru (created_at desc)."""
    raise NotImplementedError


def recent_achievements(db, limit: int):
    """Penghargaan badge terbaru yang menonjol (gold/silver) + info pengguna."""
    raise NotImplementedError


def affiliation_pool(db, me, limit: int):
    """Kandidat berbagi org_id/affiliation dengan `me` (prefilter di DB bila bisa)."""
    raise NotImplementedError


def following_ids(db, user_id: str) -> set:
    """Id yang sudah diikuti `user_id` (untuk dikecualikan dari saran)."""
    raise NotImplementedError
