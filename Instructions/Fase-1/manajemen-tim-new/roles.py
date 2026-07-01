"""
Peran & izin tim.

Peran: owner > co-owner > member.
- owner    : semua (undang, kick, hapus tim, transfer kepemilikan) + di bawahnya.
- co-owner : kelola aset + moderasi anggota + kelola diskusi (TANPA undang/kick/hapus tim).
- member   : kelola/kolaborasi aset tim + ikut diskusi.

canManageTeamAsset berbasis KEANGGOTAAN tim (bukan sekadar username owner aset).
"""
from __future__ import annotations

OWNER = "owner"
CO_OWNER = "co-owner"
MEMBER = "member"
ROLES = (OWNER, CO_OWNER, MEMBER)
RANK = {OWNER: 0, CO_OWNER: 1, MEMBER: 2}

# Aksi terkontrol.
_BASE = {"manage_asset", "post_discussion"}
_CO_OWNER = {"moderate_members", "manage_discussion"}
_OWNER_ONLY = {"invite", "kick", "delete_team", "transfer_ownership"}

PERMISSIONS = {
    OWNER: _BASE | _CO_OWNER | _OWNER_ONLY,
    CO_OWNER: _BASE | _CO_OWNER,
    MEMBER: set(_BASE),
}


class TeamError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def is_member(role: str | None) -> bool:
    return role in RANK


def can(role: str | None, action: str) -> bool:
    return action in PERMISSIONS.get(role, set())


def can_manage_team_asset(role: str | None) -> bool:
    """Setiap anggota tim boleh kelola aset milik tim (kolaborasi)."""
    return is_member(role)


def can_set_role(actor_role: str | None, target_current: str, target_new: str) -> bool:
    """Siapa boleh mengubah peran siapa."""
    if target_new not in (OWNER, CO_OWNER, MEMBER) or target_current not in ROLES:
        return False
    # Menyentuh kepemilikan (memberi/mencabut owner) → hanya owner (lewat transfer).
    if OWNER in (target_current, target_new):
        return actor_role == OWNER
    if actor_role == OWNER:
        return True
    if actor_role == CO_OWNER:
        return target_current in (MEMBER, CO_OWNER) and target_new in (MEMBER, CO_OWNER)
    return False


def require(role: str | None, action: str) -> None:
    if not can(role, action):
        raise TeamError(403, "forbidden", f"Peran '{role}' tak boleh '{action}'.")
