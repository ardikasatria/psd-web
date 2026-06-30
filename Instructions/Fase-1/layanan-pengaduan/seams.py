"""
==========================================================================
 TITIK INTEGRASI (SEAM) — pengaduan & laporan konten
==========================================================================
Guard peran (admin/support/moderator), resolusi target konten polimorфik,
dan notifikasi (Langkah 29). Aksi 'remove/lock/ban' menyentuh modul konten/akun.
"""
from __future__ import annotations


def require_staff(user) -> None:
    """Admin/support penanganan tiket pengaduan; jika bukan → 403."""
    raise NotImplementedError


def require_moderator(user) -> None:
    """Moderator/humas penanganan laporan konten; jika bukan → 403."""
    raise NotImplementedError


def resolve_target(db, kind: str, target_id: str):
    """Ambil entitas konten (post/feed/comment/thread/reply) atau None."""
    raise NotImplementedError


def apply_moderation_effect(db, kind: str, target_id: str, decision: str) -> None:
    """Terapkan keputusan: remove (sembunyikan/hapus), lock (kunci thread), warn/ban (akun)."""
    raise NotImplementedError


def notify(user_id: str, event: str, payload: dict) -> None:
    """Kirim notifikasi (Langkah 29): status tiket / hasil laporan."""
    raise NotImplementedError
