"""Peran & izin tim (owner > co-owner > member)."""
from __future__ import annotations

OWNER = "owner"
CO_OWNER = "co-owner"
MEMBER = "member"
ROLES = (OWNER, CO_OWNER, MEMBER)
RANK = {OWNER: 0, CO_OWNER: 1, MEMBER: 2}

_BASE = {"manage_asset", "post_discussion"}
_CO_OWNER = {"moderate_members", "manage_discussion"}
_OWNER_ONLY = {"invite", "kick", "delete_team", "transfer_ownership"}

PERMISSIONS = {
    OWNER: _BASE | _CO_OWNER | _OWNER_ONLY,
    CO_OWNER: _BASE | _CO_OWNER,
    MEMBER: set(_BASE),
}


def normalize_role(role: str | None) -> str | None:
    if role is None:
        return None
    if role == "admin":
        return CO_OWNER
    return role


def is_member(role: str | None) -> bool:
    return normalize_role(role) in RANK


def can(role: str | None, action: str) -> bool:
    return action in PERMISSIONS.get(normalize_role(role), set())


def can_manage_team_asset(role: str | None) -> bool:
    return is_member(role)


def can_set_role(actor_role: str | None, target_current: str, target_new: str) -> bool:
    actor = normalize_role(actor_role)
    current = normalize_role(target_current)
    new = normalize_role(target_new)
    if new not in ROLES or current not in ROLES:
        return False
    if OWNER in (current, new):
        return actor == OWNER
    if actor == OWNER:
        return True
    if actor == CO_OWNER:
        return current in (MEMBER, CO_OWNER) and new in (MEMBER, CO_OWNER)
    return False


def require_role(role: str | None, action: str) -> None:
    from app.core.errors import ApiError

    if not can(role, action):
        raise ApiError(403, "forbidden", f"Peran '{role or 'guest'}' tidak boleh '{action}'.")


require = require_role
