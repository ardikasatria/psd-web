"""Tipe organisasi & verifikasi."""
from __future__ import annotations

from app.core.errors import ApiError

ORG_TYPES = {"personal", "community", "academic", "umkm", "enterprise"}
DEMAND_TYPES = {"umkm", "enterprise", "academic"}

UNVERIFIED = "unverified"
PENDING = "pending"
VERIFIED = "verified"
REJECTED = "rejected"

_TRANSITIONS = {
    "submit": {UNVERIFIED, REJECTED},
    "approve": {PENDING},
    "reject": {PENDING},
    "revoke": {VERIFIED},
}
_RESULT = {"submit": PENDING, "approve": VERIFIED, "reject": REJECTED, "revoke": UNVERIFIED}


def validate_org_type(t: str) -> str:
    if t not in ORG_TYPES:
        raise ApiError(422, "bad_org_type", f"Tipe organisasi tak dikenal: {t}")
    return t


def apply_verification(current: str, action: str) -> str:
    if current not in _TRANSITIONS.get(action, set()):
        raise ApiError(409, "invalid_transition", f"Tak bisa '{action}' dari '{current}'.")
    return _RESULT[action]


def can_post_opportunity(org_type: str, verification: str) -> bool:
    return org_type in DEMAND_TYPES and verification == VERIFIED


def requires_verification(org_type: str) -> bool:
    return org_type in DEMAND_TYPES
