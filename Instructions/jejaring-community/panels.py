"""
Rakit panel penemuan komunitas jadi satu struktur untuk UI.

Setiap entri = ref publik + `reason` (mengapa muncul). Diri sendiri selalu dikecualikan;
panel afiliasi juga mengecualikan yang sudah diikuti (karena itu ajakan follow).
"""
from __future__ import annotations

from datetime import datetime

from . import ranking
from .affinity import suggest_affiliation
from .ranking import popularity_score


def _ref(u: dict, reason: str) -> dict:
    return {
        "username": u.get("username"),
        "type": u.get("type", "user"),
        "avatar_url": u.get("avatar_url"),
        "is_official": u.get("is_official", False),
        "reputation": u.get("reputation", 0),
        "tier": u.get("tier"),
        "reason": reason,
    }


def _fmt_count(n: int) -> str:
    return f"{n/1000:.1f}rb".replace(".0", "") if n >= 1000 else str(n)


def build_discovery(me: dict | None, *, top_tier_pool: list[dict], popular_pool: list[dict],
                    new_pool: list[dict], achievements: list[dict], affiliation_pool: list[dict],
                    following_ids=(), now: datetime | None = None, limit: int = 8) -> dict:
    me_id = me.get("id") if me else None
    ex = {me_id} if me_id else set()

    top = ranking.rank_by(top_tier_pool, lambda u: u.get("reputation", 0), limit=limit, exclude_ids=ex)
    popular = ranking.rank_by(popular_pool, popularity_score, limit=limit, exclude_ids=ex)
    fresh = ranking.new_members(new_pool, now=now, limit=limit, exclude_ids=ex)

    panels = {
        "top_tier": [_ref(u, f"Tier {u.get('tier') or '—'}") for u in top],
        "popular": [_ref(u, f"{_fmt_count(u.get('follower_count', 0))} pengikut") for u in popular],
        "new_members": [_ref(u, "Anggota baru") for u in fresh],
        "achievements": [
            _ref(a, f"Meraih {a.get('top_badge') or 'pencapaian'}")
            for a in achievements if a.get("id") != me_id
        ][:limit],
    }

    # Afiliasi hanya bila ada pengguna login dengan afiliasi/organisasi.
    if me and (me.get("affiliation") or me.get("org_id")):
        sim = suggest_affiliation(me, affiliation_pool, following_ids=following_ids, limit=limit)
        panels["affiliation"] = [_ref(u, u["_reason"]) for u in sim]
    else:
        panels["affiliation"] = []

    return panels
