"""
==========================================================================
 TITIK INTEGRASI (SEAM) — kompetisi
==========================================================================
Penilaian hanya untuk admin/humas; notebook kompetisi memakai runtime notebook
(Langkah 52b) dengan konteks competition_id. Favorit notebook reuse engagement.
"""
from __future__ import annotations


def require_humas(user) -> None:
    """Pastikan user adalah admin/humas penyelenggara; jika tidak → 403."""
    raise NotImplementedError("Cek peran admin/humas penyelenggara kompetisi.")


def list_submissions(db, competition_id: str) -> list:
    raise NotImplementedError


def list_competition_notebooks(db, competition_id: str) -> list:
    raise NotImplementedError


def list_teams(db, competition_id: str) -> list:
    raise NotImplementedError


def list_participants(db, competition_id: str) -> list:
    raise NotImplementedError


def competition_meta(db, competition_id: str) -> dict:
    """{start, deadline, higher_is_better, max_score, ...}."""
    raise NotImplementedError
