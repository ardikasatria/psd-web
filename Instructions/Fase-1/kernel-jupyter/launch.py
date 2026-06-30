"""
Orkestrasi membuka runtime server via JupyterHub untuk UI PSD.

Alur:
  1. Pastikan akses kernel server diizinkan (grant admin, Langkah 26) & di bawah batas konkuren.
  2. Pastikan server JupyterHub pengguna hidup (OAuth2/OIDC PSD → Hub).
  3. Terbitkan token Hub BER-SCOPE (hanya server pengguna ini, berumur pendek).
  4. Kembalikan config koneksi untuk editor PSD (REST + WS + token).

UI & fungsi tetap di PSD; eksekusi sel berjalan di kernel Hub di VM infra.
"""
from __future__ import annotations

from . import hub_urls


class HubAccessError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def open_server_runtime(hub_client, *, name: str, hub_public_url: str,
                        grant_active: bool, running_count: int, max_concurrent: int,
                        server_name: str = "", token_ttl: int = 3600) -> dict:
    """Kembalikan config koneksi untuk UI PSD, atau raise bila tak diizinkan."""
    if not grant_active:
        raise HubAccessError(403, "kernel_access_required",
                             "Akses kernel server belum disetujui admin.")
    if running_count >= max_concurrent:
        raise HubAccessError(429, "kernel_limit",
                             f"Batas kernel server tercapai ({max_concurrent}).")

    hub_client.ensure_server(name, server_name=server_name)

    scope = hub_urls.access_scope(name, server_name)
    tok = hub_client.create_user_token(name, scopes=[scope], expires_in=token_ttl)

    base = hub_urls.user_server_base(hub_public_url, name, server_name)
    return {
        "runtime": "server",
        "provider": "jupyterhub",
        "base_url": base,                         # REST: {base}/api/kernels
        "kernels_url": hub_urls.kernels_url(base),
        "ws_base": hub_urls.to_ws_url(base),      # WS: {ws_base}/api/kernels/{id}/channels
        "token": tok.get("token"),                # token ber-scope, berumur pendek
        "expires_in": token_ttl,
    }
