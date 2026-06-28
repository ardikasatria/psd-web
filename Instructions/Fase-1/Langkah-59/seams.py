"""
==========================================================================
 TITIK INTEGRASI (SEAM) — email
==========================================================================
Email = channel dari notifikasi Langkah 29. Sambungkan hook di sistem notifikasi
PSD agar saat notifikasi dibuat, email ikut di-dispatch (via Celery Langkah 49).
"""
from __future__ import annotations


def user_email(user_id: str) -> str | None:
    raise NotImplementedError("Kembalikan alamat email pengguna PSD (atau None).")


def user_email_prefs(user_id: str) -> dict:
    """Preferensi email pengguna (lihat preferences.py)."""
    raise NotImplementedError("Kembalikan preferensi email pengguna PSD.")


def get_provider():
    """SMTPProvider/ResendProvider terkonfigurasi (kredensial Resend)."""
    raise NotImplementedError("Sediakan provider email (Resend).")


def get_dedup():
    """Store dedup (Redis di produksi)."""
    raise NotImplementedError("Sediakan store dedup.")


def pending_digest_items(user_id: str) -> list[dict]:
    """Peristiwa 'digest' tertunda untuk job ringkasan harian."""
    raise NotImplementedError("Kembalikan peristiwa digest tertunda pengguna.")
