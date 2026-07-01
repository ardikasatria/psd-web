"""
Level akses ASET organisasi (gaya GitHub) + resolusi izin efektif (gaya GitHub/HF).

Level: read < triage < write < maintain < admin.
Izin efektif = MAKS dari: base permission org + grant via tim + grant langsung
(resource group). owner/admin org → 'admin' atas semua aset org.
"""
from __future__ import annotations

LEVELS = {"read": 0, "triage": 1, "write": 2, "maintain": 3, "admin": 4}
ORDER = ["read", "triage", "write", "maintain", "admin"]


def is_valid_level(level: str) -> bool:
    return level in LEVELS


def rank(level: str | None) -> int:
    return LEVELS.get(level, -1)


def is_at_least(level: str | None, minimum: str) -> bool:
    return rank(level) >= rank(minimum)


def max_level(levels) -> str | None:
    valid = [l for l in levels if l in LEVELS]
    if not valid:
        return None
    return max(valid, key=lambda l: LEVELS[l])


def resolve_asset_level(*, role: str | None = None, org_base: str | None = None,
                        team_levels=(), direct_level: str | None = None) -> str | None:
    """
    Izin efektif pengguna atas satu aset org.
    - owner/admin org → 'admin'.
    - selain itu → maks(org_base, level dari tim, grant langsung).
    - kolaborator luar (role None, tanpa base) → hanya grant langsung.
    """
    if role in ("owner", "admin"):
        return "admin"
    candidates = []
    if org_base:
        candidates.append(org_base)
    candidates.extend(team_levels)
    if direct_level:
        candidates.append(direct_level)
    return max_level(candidates)
