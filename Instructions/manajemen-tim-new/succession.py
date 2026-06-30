"""
Suksesi kepemilikan tim.

Saat owner keluar, hitung aktivitas tiap anggota & promosikan yang tertinggi jadi owner.
Skor = commit×3 + submission×2 + kontribusi aset×1 + pesan diskusi×0.1.
Tie-break: co-owner diutamakan, lalu yang lebih dulu bergabung.
"""
from __future__ import annotations

from .roles import CO_OWNER


def activity_score(member: dict) -> float:
    return (member.get("commits", 0) * 3
            + member.get("submissions", 0) * 2
            + member.get("contributions", 0) * 1
            + member.get("messages", 0) * 0.1)


def pick_successor(members: list[dict], *, leaving_user_id: str) -> dict | None:
    """Kembalikan anggota yang harus dipromosikan jadi owner, atau None bila tim kosong."""
    candidates = [m for m in members if m.get("user_id") != leaving_user_id]
    if not candidates:
        return None

    def key(m: dict):
        return (-activity_score(m),
                0 if m.get("role") == CO_OWNER else 1,
                m.get("joined_at", ""))

    candidates.sort(key=key)
    return candidates[0]
