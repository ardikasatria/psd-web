"""
==========================================================================
 TITIK INTEGRASI (SEAM) — SAMBUNGKAN KE PSD
==========================================================================
"""
from __future__ import annotations


def superset_identity(psd_user) -> dict:
    """Identitas untuk guest token: {username, first_name, last_name}."""
    raise NotImplementedError("Petakan user PSD → identitas guest Superset.")


def user_team_id(psd_user):
    """ID tim pengguna (integer) untuk klausa RLS."""
    raise NotImplementedError("Kembalikan team_id (integer) pengguna PSD.")


def user_can_view_dashboard(psd_user, dashboard_key) -> bool:
    """Apakah pengguna berhak melihat dashboard ini (kontrol akses PSD)."""
    raise NotImplementedError("Cek akses dashboard di sisi PSD.")


def embeddable_dashboard_uuid(dashboard_key) -> str:
    """UUID embedded Superset untuk dashboard PSD (disimpan saat enable_embedded)."""
    raise NotImplementedError("Kembalikan UUID embedded dashboard.")
