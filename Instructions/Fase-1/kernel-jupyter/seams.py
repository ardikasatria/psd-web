"""
==========================================================================
 TITIK INTEGRASI (SEAM) — JupyterHub
==========================================================================
JupyterHub dikonfigurasi GenericOAuthenticator → OIDC PSD (Langkah 48), sehingga
username Hub = username PSD. PSD = service Hub dengan token admin (kelola server + token).
"""
from __future__ import annotations


def get_hub_client():
    """JupyterHubClient terkonfigurasi (HUB_API_URL + HUB_API_TOKEN service PSD)."""
    raise NotImplementedError("Sediakan JupyterHubClient.")


def hub_username(user_id: str) -> str:
    """Username JupyterHub pengguna (= username PSD via OIDC)."""
    raise NotImplementedError("Kembalikan username Hub pengguna.")


def active_kernel_grant(user_id: str):
    """Grant akses kernel server aktif (Langkah 26) atau None."""
    raise NotImplementedError("Kembalikan grant aktif atau None.")


def running_server_count(user_id: str) -> int:
    """Jumlah server/kernel berjalan milik pengguna (untuk batas konkuren)."""
    raise NotImplementedError
