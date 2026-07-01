"""Validasi sumber panen + proteksi SSRF."""

from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

from app.core.errors import ApiError

AUTH_TYPES = {"none", "api_key", "bearer", "basic"}
_BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal", "metadata"}

HARVEST_ALLOWLIST = [
    "jsonplaceholder.typicode.com",
    "pokeapi.co",
    "api.github.com",
    "dummyjson.com",
]


def _is_dangerous_ip(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    )


def _host_allowed(host: str, allowlist: list[str]) -> bool:
    host = host.lower()
    for d in (x.lower() for x in allowlist):
        if host == d or host.endswith("." + d):
            return True
    return False


def validate_source_url(url: str, *, allowlist: list[str] | None = None) -> str:
    p = urlparse(url or "")
    if p.scheme != "https":
        raise ApiError(422, "bad_scheme", "Hanya URL https yang diizinkan.")
    host = p.hostname
    if not host:
        raise ApiError(422, "bad_url", "URL tidak valid.")
    if host.lower() in _BLOCKED_HOSTNAMES:
        raise ApiError(400, "ssrf_blocked", f"Host diblokir: {host}")
    if _is_dangerous_ip(host):
        raise ApiError(400, "ssrf_blocked", "Target internal/privat tidak diizinkan.")
    wl = allowlist if allowlist is not None else HARVEST_ALLOWLIST
    if not _host_allowed(host, wl):
        raise ApiError(403, "not_allowlisted", f"Domain tidak dalam daftar izin: {host}")
    return url


def validate_auth(auth_type: str) -> str:
    if auth_type not in AUTH_TYPES:
        raise ApiError(422, "bad_auth", f"Tipe auth tak dikenal: {auth_type}")
    return auth_type
