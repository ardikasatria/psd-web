"""Level akses aset organisasi & resolusi izin efektif."""
from __future__ import annotations

LEVELS = {"read": 0, "triage": 1, "write": 2, "maintain": 3, "admin": 4}


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


def resolve_asset_level(
    *,
    role: str | None = None,
    org_base: str | None = None,
    team_levels=(),
    direct_level: str | None = None,
) -> str | None:
    if role in ("owner", "admin"):
        return "admin"
    candidates = []
    if org_base:
        candidates.append(org_base)
    candidates.extend(team_levels)
    if direct_level:
        candidates.append(direct_level)
    return max_level(candidates)
