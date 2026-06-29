"""
Logika perangkingan untuk panel penemuan komunitas (murni, tanpa DB).

Query DB = seam; modul ini menentukan skor & urutan agar bisa diuji.
Bentuk pengguna (dict): {id, username, type, avatar_url, is_official, reputation,
tier, affiliation, org_id, follower_count, post_like_total, created_at, top_badge}.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

# Bobot popularitas: pengikut bernilai lebih dari suka (agar tak mudah di-farming).
W_FOLLOWERS = 3
W_POST_LIKES = 1


def popularity_score(u: dict) -> int:
    return (u.get("follower_count", 0) * W_FOLLOWERS
            + u.get("post_like_total", 0) * W_POST_LIKES)


def rank_by(users: list[dict], scorer, *, limit: int = 8, exclude_ids=()) -> list[dict]:
    ex = set(exclude_ids)
    pool = [u for u in users if u.get("id") not in ex]
    pool.sort(key=scorer, reverse=True)
    return pool[:limit]


def new_members(users: list[dict], *, now: datetime | None = None, days: int = 14,
                limit: int = 8, exclude_ids=()) -> list[dict]:
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    ex = set(exclude_ids)
    pool = [u for u in users
            if u.get("id") not in ex and _as_dt(u.get("created_at")) >= cutoff]
    pool.sort(key=lambda u: _as_dt(u.get("created_at")), reverse=True)
    return pool[:limit]


def _as_dt(v) -> datetime:
    if isinstance(v, datetime):
        return v if v.tzinfo else v.replace(tzinfo=timezone.utc)
    if isinstance(v, str):
        return datetime.fromisoformat(v.replace("Z", "+00:00"))
    return datetime.min.replace(tzinfo=timezone.utc)
