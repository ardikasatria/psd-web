"""Suksesi kepemilikan tim saat owner keluar."""
from __future__ import annotations

from app.modules.teams.roles import CO_OWNER


def activity_score(member: dict) -> float:
    return (
        member.get("commits", 0) * 3
        + member.get("submissions", 0) * 2
        + member.get("contributions", 0) * 1
        + member.get("messages", 0) * 0.1
    )


def pick_successor(members: list[dict], *, leaving_user_id: str) -> dict | None:
    candidates = [m for m in members if m.get("user_id") != leaving_user_id]
    if not candidates:
        return None

    def key(m: dict):
        role = m.get("role")
        if role == "admin":
            role = CO_OWNER
        return (
            -activity_score(m),
            0 if role == CO_OWNER else 1,
            m.get("joined_at", ""),
        )

    candidates.sort(key=key)
    return candidates[0]
