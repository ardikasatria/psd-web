"""Uji gamifikasi & kuota terpusat (5 tier kanonik)."""
import pytest

from psd_gamification import points, tiers
from psd_gamification import quota as quota_mod
from psd_gamification.quota import validate_matrix


def test_tier_for_reputation_thresholds():
    assert tiers.tier_slug_for_reputation(0) == "pemula"
    assert tiers.tier_slug_for_reputation(49) == "pemula"
    assert tiers.tier_slug_for_reputation(50) == "kontributor"
    assert tiers.tier_slug_for_reputation(249) == "kontributor"
    assert tiers.tier_slug_for_reputation(250) == "ahli"
    assert tiers.tier_slug_for_reputation(999) == "ahli"
    assert tiers.tier_slug_for_reputation(1000) == "master"
    assert tiers.tier_slug_for_reputation(4999) == "master"
    assert tiers.tier_slug_for_reputation(5000) == "grandmaster"


def test_reputation_to_next():
    assert tiers.reputation_to_next(12) == 38
    assert tiers.reputation_to_next(5000) is None


def test_award_reputation_points():
    assert points.award("course_completed") == 15
    assert points.award("tak_dikenal") == 0


def test_quota_lookup_per_tier():
    assert quota_mod.quota("notebook.max_notebooks", "pemula") == 3
    assert quota_mod.quota("notebook.max_notebooks", "grandmaster") == 50
    assert quota_mod.quota("inference.per_hour", "ahli") == 500
    assert quota_mod.quota("notebook.runtime", "pemula") == "browser"


def test_quota_fallback_unknown_tier():
    assert quota_mod.quota("ai.messages_per_day", "tak-ada") == 20


def test_matrix_covers_all_tiers():
    assert validate_matrix() == []


def test_check_and_consume_enforces_limit():
    store = quota_mod.InMemoryWindowStore(window_s=86400)
    for _ in range(20):
        quota_mod.check_and_consume(store, "ai.messages_per_day", "u1", "pemula")
    with pytest.raises(quota_mod.QuotaExceeded):
        quota_mod.check_and_consume(store, "ai.messages_per_day", "u1", "pemula")


def test_check_and_consume_rejects_non_numeric():
    store = quota_mod.InMemoryWindowStore()
    with pytest.raises(ValueError):
        quota_mod.check_and_consume(store, "notebook.runtime", "u1", "pemula")


def test_higher_tier_more_quota():
    store = quota_mod.InMemoryWindowStore(window_s=86400)
    for _ in range(21):
        r = quota_mod.check_and_consume(store, "ai.messages_per_day", "u2", "grandmaster")
    assert r["remaining"] == 500 - 21


def test_perks_for_reputation():
    perks = tiers.perks_for_reputation(1000)
    assert perks["upload_max_mb"] == 500
    assert perks["can_create_event"] is True
    assert tiers.perks_for_reputation(10)["can_create_event"] is False
    assert tiers.perks_for_reputation(250)["event_priority"] is True
