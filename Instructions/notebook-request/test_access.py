"""Uji logika akses kernel server (murni)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.kernel_access import policy
from app.kernel_access.policy import (
    APPROVED,
    PENDING,
    Grant,
    KernelAccessError,
)

NOW = datetime(2026, 1, 1, 12, 0, tzinfo=timezone.utc)


# -------------------- validitas grant --------------------
def test_is_active_variants():
    assert policy.is_active(Grant(APPROVED), NOW) is True               # tanpa kedaluwarsa
    assert policy.is_active(Grant(APPROVED, NOW + timedelta(hours=1)), NOW) is True
    assert policy.is_active(Grant(APPROVED, NOW - timedelta(hours=1)), NOW) is False  # lewat
    assert policy.is_active(Grant(PENDING), NOW) is False
    assert policy.is_active(Grant("revoked"), NOW) is False
    assert policy.is_active(None, NOW) is False


def test_effective_status_expired():
    g = Grant(APPROVED, NOW - timedelta(seconds=1))
    assert policy.effective_status(g, NOW) == "expired"
    assert policy.effective_status(Grant(APPROVED), NOW) == APPROVED


# -------------------- gating runtime server --------------------
def test_require_server_access_no_grant():
    with pytest.raises(KernelAccessError) as e:
        policy.require_server_access(None, running_count=0, now=NOW)
    assert e.value.status == 403 and e.value.slug == "kernel_access_required"


def test_require_server_access_over_limit():
    g = Grant(APPROVED, max_concurrent_kernels=2, cpu=2, mem_gb=4)
    with pytest.raises(KernelAccessError) as e:
        policy.require_server_access(g, running_count=2, now=NOW)
    assert e.value.status == 429


def test_require_server_access_ok_returns_limits():
    g = Grant(APPROVED, max_concurrent_kernels=3, cpu=4, mem_gb=8)
    out = policy.require_server_access(g, running_count=1, now=NOW)
    assert out == {"cpu": 4, "mem_gb": 8, "max_concurrent_kernels": 3}


def test_expired_grant_blocks_server():
    g = Grant(APPROVED, expires_at=NOW - timedelta(minutes=1))
    with pytest.raises(KernelAccessError) as e:
        policy.require_server_access(g, running_count=0, now=NOW)
    assert e.value.slug == "kernel_access_required"


# -------------------- transisi status --------------------
def test_transitions_valid():
    assert policy.apply_decision(PENDING, "approve") == "approved"
    assert policy.apply_decision(PENDING, "deny") == "denied"
    assert policy.apply_decision(APPROVED, "revoke") == "revoked"
    assert policy.apply_decision(PENDING, "cancel") == "canceled"


@pytest.mark.parametrize("current,action", [
    ("approved", "approve"), ("denied", "revoke"),
    ("revoked", "approve"), ("pending", "revoke"),
])
def test_transitions_invalid(current, action):
    with pytest.raises(KernelAccessError) as e:
        policy.apply_decision(current, action)
    assert e.value.status == 409


# -------------------- aturan pengajuan --------------------
def test_can_request_rules():
    assert policy.can_request(None, grant_active=False) is True
    assert policy.can_request("denied", grant_active=False) is True   # boleh ajukan ulang
    assert policy.can_request(PENDING, grant_active=False) is False   # sudah ada tertunda
    assert policy.can_request("approved", grant_active=True) is False  # sudah punya akses
