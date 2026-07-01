"""Uji tata kelola organisasi."""
import pytest

from app.orgs import access, membership, org_types, roles
from app.orgs.roles import ADMIN, BILLING, MEMBER, OWNER, OrgError


# -------------------- peran & izin --------------------
def test_owner_only_actions():
    for act in ("manage_billing", "delete_org", "transfer_ownership"):
        assert roles.can(OWNER, act) is True
        assert roles.can(ADMIN, act) is False


def test_admin_can_manage_but_not_billing():
    for act in ("manage_members", "manage_teams", "manage_assets", "manage_settings",
                "post_opportunity", "manage_recruitment", "manage_verification"):
        assert roles.can(ADMIN, act) is True
    assert roles.can(ADMIN, "manage_billing") is False


def test_member_and_billing_scope():
    assert roles.can(MEMBER, "view_org") is True
    assert roles.can(MEMBER, "manage_members") is False
    assert roles.can(BILLING, "manage_billing") is True
    assert roles.can(BILLING, "manage_teams") is False


def test_can_set_role():
    assert roles.can_set_role(OWNER, MEMBER, OWNER) is True       # owner boleh angkat owner
    assert roles.can_set_role(ADMIN, MEMBER, BILLING) is True     # admin: member↔billing
    assert roles.can_set_role(ADMIN, MEMBER, ADMIN) is False      # admin tak boleh angkat admin
    assert roles.can_set_role(ADMIN, OWNER, MEMBER) is False
    assert roles.can_set_role(MEMBER, MEMBER, ADMIN) is False


# -------------------- level akses aset --------------------
def test_access_ordering():
    assert access.is_at_least("write", "read") is True
    assert access.is_at_least("read", "write") is False
    assert access.max_level(["read", "write", "triage"]) == "write"


def test_resolve_asset_level():
    assert access.resolve_asset_level(role="admin") == "admin"     # admin org → admin aset
    # member: maks(base, tim, langsung)
    assert access.resolve_asset_level(role="member", org_base="read",
                                      team_levels=["write"], direct_level=None) == "write"
    assert access.resolve_asset_level(role="member", org_base="read",
                                      team_levels=[], direct_level="maintain") == "maintain"
    # kolaborator luar: hanya grant langsung
    assert access.resolve_asset_level(role=None, org_base=None,
                                      team_levels=[], direct_level="read") == "read"
    assert access.resolve_asset_level(role="member") is None       # tak ada akses


# -------------------- tipe & verifikasi --------------------
def test_verification_flow():
    assert org_types.apply_verification("unverified", "submit") == "pending"
    assert org_types.apply_verification("pending", "approve") == "verified"
    assert org_types.apply_verification("pending", "reject") == "rejected"
    assert org_types.apply_verification("rejected", "submit") == "pending"   # ajukan ulang
    assert org_types.apply_verification("verified", "revoke") == "unverified"
    with pytest.raises(OrgError) as e:
        org_types.apply_verification("verified", "approve")
    assert e.value.status == 409


def test_post_opportunity_capability():
    assert org_types.can_post_opportunity("umkm", "verified") is True
    assert org_types.can_post_opportunity("enterprise", "verified") is True
    assert org_types.can_post_opportunity("umkm", "unverified") is False    # belum terverifikasi
    assert org_types.can_post_opportunity("community", "verified") is False  # bukan sisi permintaan
    assert org_types.requires_verification("umkm") is True
    assert org_types.requires_verification("community") is False


# -------------------- keanggotaan --------------------
def test_handle_validation():
    assert membership.validate_handle("umkm-batik-lampung") == "umkm-batik-lampung"
    for bad in ["ab", "-awal", "akhir-", "Huruf-Besar", "spasi nama", "a--b", "settings"]:
        with pytest.raises(OrgError):
            membership.validate_handle(bad)


def test_last_owner_invariant():
    members = [{"user_id": "o1", "role": OWNER}, {"user_id": "m1", "role": MEMBER}]
    assert membership.can_remove_member(members, "o1") is False      # owner terakhir
    assert membership.can_remove_member(members, "m1") is True
    assert membership.can_change_role(members, "o1", MEMBER) is False  # demovasi owner terakhir
    members2 = [{"user_id": "o1", "role": OWNER}, {"user_id": "o2", "role": OWNER}]
    assert membership.can_remove_member(members2, "o1") is True       # masih ada owner lain


def test_can_create_many_orgs():
    assert membership.can_create_org(5, cap=None) is True            # tak terbatas
    assert membership.can_create_org(3, cap=3) is False              # batas paket
    assert membership.can_create_org(2, cap=3) is True
