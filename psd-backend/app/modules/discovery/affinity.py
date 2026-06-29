"""Saran orang serupa berbasis afiliasi."""
from __future__ import annotations

from .ranking import popularity_score


def _norm(s) -> str:
    return (s or "").strip().lower()


def shares_affiliation(me: dict, other: dict) -> tuple[bool, str | None]:
    if me.get("org_id") and other.get("org_id") and me["org_id"] == other["org_id"]:
        return True, other.get("org_name") or "organisasi yang sama"
    if _norm(me.get("affiliation")) and _norm(me.get("affiliation")) == _norm(other.get("affiliation")):
        return True, other.get("affiliation")
    return False, None


def suggest_affiliation(me: dict, candidates: list[dict], *, following_ids=(), limit: int = 8) -> list[dict]:
    follow = set(following_ids)
    out = []
    for c in candidates:
        if c.get("id") == me.get("id") or c.get("id") in follow:
            continue
        ok, reason = shares_affiliation(me, c)
        if not ok:
            continue
        out.append((c, reason))
    out.sort(key=lambda t: (popularity_score(t[0]), t[0].get("reputation", 0)), reverse=True)
    return [{**c, "_reason": f"Sesama {reason}"} for c, reason in out[:limit]]
