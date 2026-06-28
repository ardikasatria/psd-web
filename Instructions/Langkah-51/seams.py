"""
==========================================================================
 TITIK INTEGRASI (SEAM) — notifikasi (Langkah 29) & identitas
==========================================================================
"""
from __future__ import annotations


def notify(user_id: str, kind: str, payload: dict) -> None:
    """Kirim notifikasi PSD (Langkah 29).

    kind ∈ {pr_opened, pr_reviewed, pr_merged, pr_commented}.
    Sambungkan ke sistem notifikasi PSD yang sudah ada.
    """
    raise NotImplementedError("Sambungkan ke sistem notifikasi PSD (Langkah 29).")


def repo_owner_user(base_owner: str, base_repo: str) -> str:
    """ID pengguna PSD pemilik repo (penerima notifikasi pr_opened)."""
    raise NotImplementedError("Kembalikan user_id pemilik repo PSD.")


def pull_author_user(pr: dict) -> str:
    """ID pengguna PSD penulis PR (dari pr['user']['login'] → user PSD)."""
    raise NotImplementedError("Petakan penulis PR Gitea → user_id PSD.")


def contributor_namespace(contributor_user_id: str) -> str:
    """Username/namespace Gitea milik kontributor (tempat fork dibuat)."""
    raise NotImplementedError("Kembalikan username Gitea kontributor.")
