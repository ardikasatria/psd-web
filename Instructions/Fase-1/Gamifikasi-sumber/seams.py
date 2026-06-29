"""
==========================================================================
 TITIK INTEGRASI (SEAM) — gamifikasi
==========================================================================
Semua fitur memanggil `user_tier(user_id)` di sini → satu jalur penentuan tier.
"""
from __future__ import annotations

from .tiers import tier_for_points


def user_points(user_id: str) -> int:
    """Total poin pengguna (dari penyimpanan gamifikasi PSD / Fase 0)."""
    raise NotImplementedError("Kembalikan total poin pengguna PSD.")


def user_tier(user_id: str) -> str:
    """Tier pengguna dari poin. Fitur lain memanggil INI, bukan menghitung sendiri.

    Bila Fase 0 sudah menyimpan tier langsung, ganti badan fungsi ini untuk
    mengembalikannya — tetapi tetap SATU pintu.
    """
    return tier_for_points(user_points(user_id))


def get_quota_store():
    """Store kuota berjendela (Redis di produksi)."""
    raise NotImplementedError("Sediakan store kuota.")
