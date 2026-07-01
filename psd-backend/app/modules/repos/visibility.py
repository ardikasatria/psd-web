"""Kontrol akses baca aset berdasarkan visibilitas (public/private).

Aturan:
- ``public``  → siapa saja boleh melihat.
- ``private`` → hanya pemilik, anggota tim aset, dan staf (moderator/superadmin).

Dipakai oleh endpoint detail/list repos (dataset/model/proyek) & sub-rute aset
agar aset privat tidak bocor ke pengguna lain.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.repos.models import Repo
from app.modules.teams.deps import membership
from app.modules.users.models import User
from app.modules.users.refs import is_staff

_STAFF_ROLES = ("superadmin", "humas", "moderator")


async def can_view_repo(db: AsyncSession, repo: Repo, viewer: User | None) -> bool:
    """True bila ``viewer`` berhak melihat ``repo``."""
    if getattr(repo, "visibility", "public") != "private":
        return True
    if viewer is None:
        return False
    if repo.owner_id == viewer.id:
        return True
    if getattr(viewer, "role", None) in _STAFF_ROLES or is_staff(viewer):
        return True
    if repo.team_id and await membership(db, repo.team_id, viewer.id):
        return True
    return False


async def ensure_can_view_repo(db: AsyncSession, repo: Repo, viewer: User | None) -> None:
    """Angkat 404 bila aset privat tak boleh dilihat (sembunyikan keberadaannya)."""
    if not await can_view_repo(db, repo, viewer):
        # 404 (bukan 403) agar keberadaan aset privat tidak terekspos.
        raise ApiError(404, "not_found", "Aset tidak ditemukan")


def viewer_visibility_filter(viewer: User | None):
    """Klausa SQL untuk daftar: hanya publik, plus milik viewer bila login.

    Staf melihat semuanya (kembalikan ``None`` → tanpa filter).
    """
    if viewer is not None and (getattr(viewer, "role", None) in _STAFF_ROLES or is_staff(viewer)):
        return None
    if viewer is None:
        return Repo.visibility == "public"
    return (Repo.visibility == "public") | (Repo.owner_id == viewer.id)
