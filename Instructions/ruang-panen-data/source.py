"""
Validasi sumber panen + PROTEKSI SSRF.

Panen menembak URL eksternal, jadi WAJIB memblokir target internal (localhost,
IP privat, link-local/metadata cloud 169.254.169.254) & menghormati allowlist domain.
Catatan: ini validasi literal; saat request nyata, resolusi DNS harus dicek ulang
(anti DNS-rebinding) di layer HTTP.
"""
from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

from .job import HarvestError

AUTH_TYPES = {"none", "api_key", "bearer", "basic"}
_BLOCKED_HOSTNAMES = {"localhost", "metadata.google.internal", "metadata"}


def _is_dangerous_ip(host: str) -> bool:
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return False
    return (ip.is_private or ip.is_loopback or ip.is_link_local
            or ip.is_reserved or ip.is_multicast or ip.is_unspecified)


def _host_allowed(host: str, allowlist) -> bool:
    host = host.lower()
    for d in (d.lower() for d in allowlist):
        if host == d or host.endswith("." + d):
            return True
    return False


def validate_source_url(url: str, *, allowlist=None, allow_http: bool = False) -> str:
    p = urlparse(url or "")
    schemes = ("http", "https") if allow_http else ("https",)
    if p.scheme not in schemes:
        raise HarvestError(422, "bad_scheme", "Hanya URL https yang diizinkan.")
    host = p.hostname
    if not host:
        raise HarvestError(422, "bad_url", "URL tidak valid.")
    if host.lower() in _BLOCKED_HOSTNAMES:
        raise HarvestError(400, "blocked_host", f"Host diblokir: {host}")
    if _is_dangerous_ip(host):
        raise HarvestError(400, "ssrf_blocked", "Target internal/privat tidak diizinkan.")
    if allowlist is not None and not _host_allowed(host, allowlist):
        raise HarvestError(403, "not_allowlisted", f"Domain tidak dalam daftar izin: {host}")
    return url


def validate_auth(auth_type: str) -> str:
    if auth_type not in AUTH_TYPES:
        raise HarvestError(422, "bad_auth", f"Tipe auth tak dikenal: {auth_type}")
    return auth_type
