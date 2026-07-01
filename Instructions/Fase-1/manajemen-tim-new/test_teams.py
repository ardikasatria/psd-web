"""Uji manajemen tim."""
import pytest

from app.teams import assets, roles, succession
from app.teams.roles import CO_OWNER, MEMBER, OWNER, TeamError


# -------------------- izin peran --------------------
def test_owner_only_actions():
    for act in ("invite", "kick", "delete_team", "transfer_ownership"):
        assert roles.can(OWNER, act) is True
        assert roles.can(CO_OWNER, act) is False
        assert roles.can(MEMBER, act) is False


def test_co_owner_powers():
    assert roles.can(CO_OWNER, "moderate_members") is True
    assert roles.can(CO_OWNER, "manage_discussion") is True
    assert roles.can(CO_OWNER, "manage_asset") is True
    assert roles.can(CO_OWNER, "delete_team") is False      # tak boleh hapus tim


def test_member_base():
    assert roles.can(MEMBER, "manage_asset") is True
    assert roles.can(MEMBER, "post_discussion") is True
    assert roles.can(MEMBER, "moderate_members") is False


def test_can_manage_team_asset_by_membership():
    assert roles.can_manage_team_asset(MEMBER) is True       # keanggotaan, bukan owner-username
    assert roles.can_manage_team_asset(CO_OWNER) is True
    assert roles.can_manage_team_asset(None) is False        # bukan anggota


def test_can_set_role():
    # owner bebas (termasuk memberi co-owner)
    assert roles.can_set_role(OWNER, MEMBER, CO_OWNER) is True
    # co-owner hanya member↔co-owner, tak boleh menyentuh owner
    assert roles.can_set_role(CO_OWNER, MEMBER, CO_OWNER) is True
    assert roles.can_set_role(CO_OWNER, CO_OWNER, OWNER) is False
    assert roles.can_set_role(CO_OWNER, OWNER, MEMBER) is False
    # member tak boleh
    assert roles.can_set_role(MEMBER, MEMBER, CO_OWNER) is False


def test_require_raises():
    with pytest.raises(TeamError) as e:
        roles.require(MEMBER, "delete_team")
    assert e.value.status == 403


# -------------------- suksesi owner --------------------
def test_pick_successor_highest_activity():
    members = [
        {"user_id": "owner", "role": OWNER, "commits": 100},
        {"user_id": "a", "role": MEMBER, "commits": 5, "submissions": 1},        # 17
        {"user_id": "b", "role": CO_OWNER, "commits": 5, "submissions": 1},      # 17 (seri → co-owner menang)
        {"user_id": "c", "role": MEMBER, "commits": 10},                          # 30
    ]
    s = succession.pick_successor(members, leaving_user_id="owner")
    assert s["user_id"] == "c"                                # aktivitas tertinggi


def test_pick_successor_tiebreak_co_owner():
    members = [
        {"user_id": "owner", "role": OWNER},
        {"user_id": "a", "role": MEMBER, "commits": 5, "joined_at": "2026-01-01"},
        {"user_id": "b", "role": CO_OWNER, "commits": 5, "joined_at": "2026-02-01"},
    ]
    s = succession.pick_successor(members, leaving_user_id="owner")
    assert s["user_id"] == "b"                                # seri skor → co-owner diutamakan


def test_pick_successor_empty():
    assert succession.pick_successor([{"user_id": "owner", "role": OWNER}],
                                     leaving_user_id="owner") is None


# -------------------- jenis aset tim --------------------
def test_team_asset_kinds_extended():
    for k in ("project", "model", "dataset", "notebook", "idea_space",
              "data_factory", "transformer_space", "model_registry",
              "synthetic_data", "analytics_space"):
        assert assets.is_team_asset_kind(k) is True
    with pytest.raises(TeamError):
        assets.validate_asset_kind("random_thing")


# -------------------- diskusi & file --------------------
def test_validate_message():
    assets.validate_message("halo", None)                    # ok
    assets.validate_message(None, [{"id": "f1"}])            # ok (hanya file)
    with pytest.raises(TeamError) as e:
        assets.validate_message("   ", None)
    assert e.value.slug == "empty_message"


def test_validate_attachment():
    assets.validate_attachment("data.csv", 1000, max_bytes=10_000)   # ok
    with pytest.raises(TeamError) as e1:
        assets.validate_attachment("big.csv", 20_000, max_bytes=10_000)
    assert e1.value.status == 413
    with pytest.raises(TeamError) as e2:
        assets.validate_attachment("virus.exe", 100, max_bytes=10_000)
    assert e2.value.status == 415
