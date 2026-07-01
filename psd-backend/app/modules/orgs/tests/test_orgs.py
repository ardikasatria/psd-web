"""Uji tata kelola organisasi."""
import pytest

from app.core.errors import ApiError
from app.modules.orgs import access, membership, org_types, roles
from app.modules.orgs.roles import ADMIN, BILLING, MEMBER, OWNER


def test_owner_only_actions():
    for act in ("manage_billing", "delete_org", "transfer_ownership"):
        assert roles.can(OWNER, act) is True
        assert roles.can(ADMIN, act) is False


def test_admin_can_manage_but_not_billing():
    for act in (
        "manage_members",
        "manage_teams",
        "manage_assets",
        "manage_settings",
        "post_opportunity",
        "manage_recruitment",
        "manage_verification",
    ):
        assert roles.can(ADMIN, act) is True
    assert roles.can(ADMIN, "manage_billing") is False


def test_member_and_billing_scope():
    assert roles.can(MEMBER, "view_org") is True
    assert roles.can(MEMBER, "manage_members") is False
    assert roles.can(BILLING, "manage_billing") is True
    assert roles.can(BILLING, "manage_teams") is False


def test_can_set_role():
    assert roles.can_set_role(OWNER, MEMBER, OWNER) is True
    assert roles.can_set_role(ADMIN, MEMBER, BILLING) is True
    assert roles.can_set_role(ADMIN, MEMBER, ADMIN) is False
    assert roles.can_set_role(ADMIN, OWNER, MEMBER) is False
    assert roles.can_set_role(MEMBER, MEMBER, ADMIN) is False


def test_access_ordering():
    assert access.is_at_least("write", "read") is True
    assert access.is_at_least("read", "write") is False
    assert access.max_level(["read", "write", "triage"]) == "write"


def test_resolve_asset_level():
    assert access.resolve_asset_level(role="admin") == "admin"
    assert (
        access.resolve_asset_level(role="member", org_base="read", team_levels=["write"], direct_level=None)
        == "write"
    )
    assert (
        access.resolve_asset_level(
            role="member", org_base="read", team_levels=[], direct_level="maintain"
        )
        == "maintain"
    )
    assert access.resolve_asset_level(role=None, org_base=None, team_levels=[], direct_level="read") == "read"
    assert access.resolve_asset_level(role="member") is None


def test_verification_flow():
    assert org_types.apply_verification("unverified", "submit") == "pending"
    assert org_types.apply_verification("pending", "approve") == "verified"
    assert org_types.apply_verification("pending", "reject") == "rejected"
    assert org_types.apply_verification("rejected", "submit") == "pending"
    assert org_types.apply_verification("verified", "revoke") == "unverified"
    with pytest.raises(ApiError) as e:
        org_types.apply_verification("verified", "approve")
    assert e.value.status == 409


def test_post_opportunity_capability():
    assert org_types.can_post_opportunity("umkm", "verified") is True
    assert org_types.can_post_opportunity("enterprise", "verified") is True
    assert org_types.can_post_opportunity("umkm", "unverified") is False
    assert org_types.can_post_opportunity("community", "verified") is False
    assert org_types.requires_verification("umkm") is True
    assert org_types.requires_verification("community") is False


def test_handle_validation():
    assert membership.validate_handle("umkm-batik-lampung") == "umkm-batik-lampung"
    for bad in ["ab", "-awal", "akhir-", "Huruf-Besar", "spasi nama", "a--b", "settings"]:
        with pytest.raises(ApiError):
            membership.validate_handle(bad)


def test_last_owner_invariant():
    members = [{"user_id": "o1", "role": OWNER}, {"user_id": "m1", "role": MEMBER}]
    assert membership.can_remove_member(members, "o1") is False
    assert membership.can_remove_member(members, "m1") is True
    assert membership.can_change_role(members, "o1", MEMBER) is False
    members2 = [{"user_id": "o1", "role": OWNER}, {"user_id": "o2", "role": OWNER}]
    assert membership.can_remove_member(members2, "o1") is True


def test_can_create_many_orgs():
    assert membership.can_create_org(5, cap=None) is True
    assert membership.can_create_org(3, cap=3) is False
    assert membership.can_create_org(2, cap=3) is True
