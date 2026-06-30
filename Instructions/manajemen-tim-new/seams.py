"""
==========================================================================
 TITIK INTEGRASI (SEAM) — tim
==========================================================================
Keanggotaan, transfer kepemilikan, penyimpanan aset/diskusi/file. File diskusi
disimpan di MinIO (presigned) & dirujuk dari pesan/ruang diskusi.
"""
from __future__ import annotations


def member_role(db, team_id: str, user_id: str) -> str | None:
    """Peran user di tim (owner/co-owner/member) atau None bila bukan anggota."""
    raise NotImplementedError


def list_members_with_activity(db, team_id: str) -> list[dict]:
    """Anggota + metrik aktivitas (commits/submissions/contributions/messages/joined_at/role)."""
    raise NotImplementedError


def transfer_ownership(db, team_id: str, new_owner_id: str, old_owner_id: str | None) -> None:
    """Set new_owner jadi owner; demovasi owner lama (atau lepas)."""
    raise NotImplementedError


def attach_file(db, team_id: str, uploader_id: str, file_meta: dict) -> dict:
    """Simpan metadata file diskusi (key MinIO, nama, ukuran) → record file."""
    raise NotImplementedError


def presign_upload(team_id: str, filename: str) -> dict:
    """URL presigned MinIO untuk unggah lampiran diskusi."""
    raise NotImplementedError
