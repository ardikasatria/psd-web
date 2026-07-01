"""Keanggotaan organisasi: validasi handle, invariant owner terakhir."""
from __future__ import annotations

import re

from app.core.errors import ApiError
from app.modules.orgs.roles import OWNER

_RESERVED = {
    "new",
    "settings",
    "admin",
    "api",
    "org",
    "orgs",
    "login",
    "logout",
    "explore",
    "search",
    "about",
    "help",
    "support",
    "billing",
}


def validate_handle(handle: str) -> str:
    h = (handle or "").strip().lower()
    if not re.match(r"^[a-z0-9](?:[a-z0-9-]{1,37}[a-z0-9])$", h):
        raise ApiError(
            422,
            "bad_handle",
            "Handle 3–39 karakter: huruf kecil/angka/tanda hubung, tak diawali/diakhiri hubung.",
        )
    if "--" in h:
        raise ApiError(422, "bad_handle", "Handle tak boleh memuat tanda hubung ganda.")
    if h in _RESERVED:
        raise ApiError(409, "reserved_handle", f"Handle '{h}' sudah dipakai sistem.")
    return h


def count_owners(members: list[dict]) -> int:
    return sum(1 for m in members if m.get("role") == OWNER)


def can_remove_member(members: list[dict], target_user_id: str) -> bool:
    target = next((m for m in members if m.get("user_id") == target_user_id), None)
    if target is None:
        return False
    if target.get("role") == OWNER and count_owners(members) <= 1:
        return False
    return True


def can_change_role(members: list[dict], target_user_id: str, new_role: str) -> bool:
    target = next((m for m in members if m.get("user_id") == target_user_id), None)
    if target is None:
        return False
    if target.get("role") == OWNER and new_role != OWNER and count_owners(members) <= 1:
        return False
    return True


def can_create_org(current_org_count: int, cap: int | None) -> bool:
    if cap is None:
        return True
    return current_org_count < cap
