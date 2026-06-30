"""Pembentuk URL & scope JupyterHub."""
from __future__ import annotations


def user_server_base(hub_public_url: str, name: str, server_name: str = "") -> str:
    base = hub_public_url.rstrip("/")
    seg = f"/user/{name}" + (f"/{server_name}" if server_name else "")
    return base + seg


def kernels_url(server_base: str) -> str:
    return server_base.rstrip("/") + "/api/kernels"


def to_ws_url(http_url: str) -> str:
    if http_url.startswith("https://"):
        return "wss://" + http_url[len("https://") :]
    if http_url.startswith("http://"):
        return "ws://" + http_url[len("http://") :]
    return http_url


def ws_channels_url(server_base: str, kernel_id: str) -> str:
    return to_ws_url(server_base.rstrip("/")) + f"/api/kernels/{kernel_id}/channels"


def access_scope(name: str, server_name: str = "") -> str:
    suffix = f"/{server_name}" if server_name else ""
    return f"access:servers!user={name}{suffix}"


def server_ready(user_model: dict, server_name: str = "") -> bool:
    servers = user_model.get("servers") or {}
    s = servers.get(server_name)
    if s is not None:
        return bool(s.get("ready"))
    return bool(user_model.get("server")) and not user_model.get("pending")
