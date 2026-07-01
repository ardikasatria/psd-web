"""
==========================================================================
 TITIK INTEGRASI (SEAM) — organisasi
==========================================================================
Keanggotaan org, transfer, penyimpanan org/tim/aset/peluang, & guard admin platform
(super-admin PSD untuk verifikasi & moderasi org).
"""
from __future__ import annotations


def org_role(db, org_id: str, user_id: str) -> str | None:
    """Peran user di org (owner/admin/member/billing_manager) atau None."""
    raise NotImplementedError


def list_org_members(db, org_id: str) -> list[dict]:
    raise NotImplementedError


def user_org_count(db, user_id: str) -> int:
    """Jumlah org yang DIMILIKI user (untuk batas paket)."""
    raise NotImplementedError


def transfer_ownership(db, org_id: str, new_owner_id: str) -> None:
    raise NotImplementedError


def require_platform_admin(user) -> None:
    """Super-admin PSD (verifikasi org, suspend). Jika bukan → 403."""
    raise NotImplementedError


def team_levels_for(db, org_id: str, user_id: str, asset_id: str) -> list[str]:
    """Level akses aset dari semua tim org yang memuat user (untuk resolve_asset_level)."""
    raise NotImplementedError
