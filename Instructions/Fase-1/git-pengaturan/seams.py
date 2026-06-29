"""
==========================================================================
 TITIK INTEGRASI (SEAM) — kunci SSH Git
==========================================================================
"""
from __future__ import annotations


def get_gitea_client():
    """GiteaKeysClient terkonfigurasi (admin token Gitea, Langkah 50)."""
    raise NotImplementedError("Sediakan GiteaKeysClient.")


def gitea_username(user_id: str) -> str:
    """Username Gitea pengguna (dari provisioning OIDC Langkah 50)."""
    raise NotImplementedError("Kembalikan username Gitea pengguna.")


class KeyStore:
    """Penyimpanan referensi kunci SSH di DB PSD (publik saja, tanpa kunci privat)."""
    def exists_fingerprint(self, user_id: str, fingerprint: str) -> bool:
        raise NotImplementedError

    def save(self, user_id: str, ref: dict) -> None:
        raise NotImplementedError

    def get(self, user_id: str, key_id: int) -> dict | None:
        raise NotImplementedError

    def list(self, user_id: str) -> list:
        raise NotImplementedError

    def delete(self, user_id: str, key_id: int) -> None:
        raise NotImplementedError
