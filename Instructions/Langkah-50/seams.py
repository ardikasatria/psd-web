"""
==========================================================================
 TITIK INTEGRASI (SEAM) — SAMBUNGKAN KE MODEL REPO PSD
==========================================================================
Modul Gitea tak tahu skema repo PSD. Sambungkan fungsi-fungsi ini.
"""
from __future__ import annotations

from .settings import settings


def repo_slug(psd_repo) -> str:
    """Nama repo di Gitea dari objek repo PSD (mis. psd_repo.slug)."""
    raise NotImplementedError("Kembalikan slug repo PSD.")


def owner_username(psd_repo) -> str:
    """Username pemilik di Gitea. Mode 'org' → settings.ORG; mode 'user' → username PSD."""
    if settings.NAMESPACE_MODE == "org":
        return settings.ORG
    raise NotImplementedError("Kembalikan username pemilik (mode 'user').")


def owner_email(psd_repo) -> str:
    raise NotImplementedError("Kembalikan email pemilik (untuk ensure_user).")


def save_gitea_link(psd_repo, *, clone_url: str, gitea_repo_id: int) -> None:
    """Simpan clone_url & gitea_repo_id ke baris repo PSD."""
    raise NotImplementedError("Simpan clone_url & gitea_repo_id ke DB PSD.")


def get_legacy_files(psd_repo) -> list[dict]:
    """Kembalikan files[] lama: [{'path': str, 'content': str|bytes}, ...]."""
    raise NotImplementedError("Kembalikan files[] lama dari penyimpanan PSD.")


def set_source_of_truth(psd_repo, value: str) -> None:
    """value ∈ {'psd', 'gitea'}. Dipakai saat flip (sub-langkah 4)."""
    raise NotImplementedError("Set flag source_of_truth pada repo PSD.")


def iter_legacy_repos():
    """Iterasi semua repo PSD yang masih perlu di-backfill ke Gitea."""
    raise NotImplementedError("Yield objek repo PSD yang belum bermigrasi.")
