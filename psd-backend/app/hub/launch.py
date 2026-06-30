"""Orkestrasi runtime server JupyterHub untuk editor PSD."""
from __future__ import annotations

from app.hub import hub_urls


class HubAccessError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def open_server_runtime(
    hub_client,
    *,
    name: str,
    hub_public_url: str,
    grant_active: bool,
    running_count: int,
    max_concurrent: int,
    server_name: str = "",
    token_ttl: int = 3600,
    spawn_timeout_s: int = 90,
) -> dict:
    if not grant_active:
        raise HubAccessError(
            403,
            "kernel_access_required",
            "Akses kernel server belum disetujui admin.",
        )
    if running_count >= max_concurrent:
        raise HubAccessError(
            429,
            "kernel_limit",
            f"Batas kernel server tercapai ({max_concurrent}).",
        )

    hub_client.ensure_server(name, server_name=server_name, timeout_s=spawn_timeout_s)

    scope = hub_urls.access_scope(name, server_name)
    tok = hub_client.create_user_token(name, scopes=[scope], expires_in=token_ttl)

    base = hub_urls.user_server_base(hub_public_url, name, server_name)
    return {
        "runtime": "server",
        "provider": "jupyterhub",
        "base_url": base,
        "kernels_url": hub_urls.kernels_url(base),
        "ws_base": hub_urls.to_ws_url(base),
        "token": tok.get("token"),
        "expires_in": token_ttl,
    }
