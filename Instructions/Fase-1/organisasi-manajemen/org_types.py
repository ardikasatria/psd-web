"""
Tipe organisasi & VERIFIKASI — lapisan khas PSD yang menghubungkan talenta↔UMKM/enterprise.

Tipe: personal, community, academic, umkm, enterprise.
Verifikasi (KYC ringan): unverified → pending → verified | rejected.
Kapabilitas pasar (posting peluang & rekrutmen talenta) hanya untuk org SISI PERMINTAAN
(umkm/enterprise/academic) yang TERVERIFIKASI.
"""
from __future__ import annotations

from .roles import OrgError

ORG_TYPES = {"personal", "community", "academic", "umkm", "enterprise"}
# Tipe sisi permintaan (mempekerjakan/menggandeng talenta).
DEMAND_TYPES = {"umkm", "enterprise", "academic"}

UNVERIFIED = "unverified"
PENDING = "pending"
VERIFIED = "verified"
REJECTED = "rejected"

_TRANSITIONS = {
    "submit": {UNVERIFIED, REJECTED},   # ajukan / ajukan ulang
    "approve": {PENDING},
    "reject": {PENDING},
    "revoke": {VERIFIED},
}
_RESULT = {"submit": PENDING, "approve": VERIFIED, "reject": REJECTED, "revoke": UNVERIFIED}


def validate_org_type(t: str) -> str:
    if t not in ORG_TYPES:
        raise OrgError(422, "bad_org_type", f"Tipe organisasi tak dikenal: {t}")
    return t


def apply_verification(current: str, action: str) -> str:
    if current not in _TRANSITIONS.get(action, set()):
        raise OrgError(409, "invalid_transition", f"Tak bisa '{action}' dari '{current}'.")
    return _RESULT[action]


def can_post_opportunity(org_type: str, verification: str) -> bool:
    """Hanya org sisi permintaan yang terverifikasi boleh memasang peluang/rekrut talenta."""
    return org_type in DEMAND_TYPES and verification == VERIFIED


def requires_verification(org_type: str) -> bool:
    """Tipe sisi permintaan butuh verifikasi sebelum aktif di pasar."""
    return org_type in DEMAND_TYPES
