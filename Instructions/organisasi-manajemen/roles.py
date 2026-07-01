"""
Peran & izin ORGANISASI (perpaduan GitHub org + Hugging Face org).

Peran: owner > admin > member; billing_manager (khusus tagihan).
- owner   : semua (tagihan, hapus org, transfer kepemilikan).
- admin   : kelola anggota/tim/aset/pengaturan + posting peluang & rekrutmen (TANPA tagihan/hapus/transfer).
- member  : akses dasar (level aset diatur access.py); bukan tata kelola.
- billing_manager: hanya tagihan.

Multi-owner diizinkan (seperti GitHub/HF). Invariant: minimal selalu ada 1 owner.
"""
from __future__ import annotations

OWNER = "owner"
ADMIN = "admin"
MEMBER = "member"
BILLING = "billing_manager"
ORG_ROLES = (OWNER, ADMIN, MEMBER, BILLING)

_MEMBER = {"view_org"}
_ADMIN = _MEMBER | {"manage_members", "manage_teams", "manage_assets",
                    "manage_settings", "post_opportunity", "manage_recruitment",
                    "manage_verification"}
_OWNER = _ADMIN | {"manage_billing", "delete_org", "transfer_ownership"}

PERMISSIONS = {
    MEMBER: set(_MEMBER),
    BILLING: _MEMBER | {"manage_billing"},
    ADMIN: set(_ADMIN),
    OWNER: set(_OWNER),
}


class OrgError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def is_member(role: str | None) -> bool:
    return role in PERMISSIONS


def can(role: str | None, action: str) -> bool:
    return action in PERMISSIONS.get(role, set())


def require(role: str | None, action: str) -> None:
    if not can(role, action):
        raise OrgError(403, "forbidden", f"Peran '{role}' tak boleh '{action}'.")


def can_set_role(actor_role: str | None, target_current: str, target_new: str) -> bool:
    """owner: atur peran apa pun (termasuk owner). admin: hanya member↔billing_manager."""
    if target_new not in ORG_ROLES or target_current not in ORG_ROLES:
        return False
    if actor_role == OWNER:
        return True
    if actor_role == ADMIN:
        return (target_current in (MEMBER, BILLING) and target_new in (MEMBER, BILLING))
    return False
