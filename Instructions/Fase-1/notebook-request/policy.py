"""
Logika akses kernel server (permintaan & manajemen oleh admin).

Terpisah dari gamifikasi: kernel SERVER hanya untuk pengguna dengan GRANT aktif
(disetujui admin). Browser/JupyterLite tetap terbuka untuk semua.

Modul murni (tanpa DB/web) agar bisa diuji. Endpoint & model SQLAlchemy ada di brief.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

# Status siklus hidup permintaan/grant.
PENDING = "pending"
APPROVED = "approved"
DENIED = "denied"
REVOKED = "revoked"
EXPIRED = "expired"
CANCELED = "canceled"
STATUSES = {PENDING, APPROVED, DENIED, REVOKED, EXPIRED, CANCELED}


class KernelAccessError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


@dataclass
class Grant:
    """Hasil keputusan admin untuk satu permintaan."""
    status: str
    expires_at: datetime | None = None       # None = tanpa kedaluwarsa
    max_concurrent_kernels: int = 1
    cpu: float = 1.0
    mem_gb: float = 2.0


def _now(now: datetime | None) -> datetime:
    return now or datetime.now(timezone.utc)


def is_active(grant: Grant | None, now: datetime | None = None) -> bool:
    if grant is None or grant.status != APPROVED:
        return False
    if grant.expires_at is not None and grant.expires_at <= _now(now):
        return False
    return True


def effective_status(grant: Grant, now: datetime | None = None) -> str:
    """Tampilkan 'expired' bila disetujui tapi sudah lewat masa berlaku."""
    if grant.status == APPROVED and grant.expires_at and grant.expires_at <= _now(now):
        return EXPIRED
    return grant.status


def require_server_access(grant: Grant | None, *, running_count: int,
                          now: datetime | None = None) -> dict:
    """Gate runtime SERVER. Raise bila tak ada grant aktif / lewat batas konkuren."""
    if not is_active(grant, now):
        raise KernelAccessError(403, "kernel_access_required",
                                "Akses kernel server belum disetujui admin.")
    if running_count >= grant.max_concurrent_kernels:
        raise KernelAccessError(429, "kernel_limit",
                                f"Batas kernel server tercapai ({grant.max_concurrent_kernels}).")
    return {"cpu": grant.cpu, "mem_gb": grant.mem_gb,
            "max_concurrent_kernels": grant.max_concurrent_kernels}


# ---------- siklus hidup permintaan ----------
_TRANSITIONS = {
    "approve": {PENDING},
    "deny": {PENDING},
    "revoke": {APPROVED},
    "cancel": {PENDING},     # oleh pengguna
}
_RESULT = {"approve": APPROVED, "deny": DENIED, "revoke": REVOKED, "cancel": CANCELED}


def apply_decision(current: str, action: str) -> str:
    if current not in _TRANSITIONS.get(action, set()):
        raise KernelAccessError(409, "invalid_transition",
                                f"Tak bisa '{action}' dari status '{current}'.")
    return _RESULT[action]


def can_request(latest_status: str | None, grant_active: bool) -> bool:
    """Boleh mengajukan bila belum punya akses aktif & tak ada permintaan tertunda."""
    if grant_active:
        return False
    if latest_status == PENDING:
        return False
    return True
