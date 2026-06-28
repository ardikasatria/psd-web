"""
Uji gamifikasi & kuota terpusat (sumber kebenaran tunggal).
"""
import pytest

from app.gamification import points, quota, tiers


# -------------------- tier dari poin --------------------
def test_tier_for_points_thresholds():
    assert tiers.tier_for_points(0) == "pemula"
    assert tiers.tier_for_points(499) == "pemula"
    assert tiers.tier_for_points(500) == "menengah"
    assert tiers.tier_for_points(1999) == "menengah"
    assert tiers.tier_for_points(2000) == "lanjut"
    assert tiers.tier_for_points(99999) == "lanjut"


def test_next_tier_and_points_to_next():
    assert tiers.next_tier("pemula").name == "menengah"
    assert tiers.points_to_next(300) == 200          # 500-300
    assert tiers.points_to_next(2000) is None        # sudah tertinggi
    assert tiers.next_tier("lanjut") is None


# -------------------- perolehan poin --------------------
def test_award_and_total():
    assert points.award("course_completed") == 100
    assert points.award("tak_dikenal") == 0
    total = points.total_points({"course_completed": 2, "pr_merged": 3, "daily_login": 4})
    assert total == 200 + 120 + 20                   # 340
    assert tiers.tier_for_points(total) == "pemula"  # 340 < 500


def test_points_drive_tier_progression():
    counts = {"course_completed": 5, "competition_top3": 1}   # 500 + 200 = 700
    assert tiers.tier_for_points(points.total_points(counts)) == "menengah"


# -------------------- matriks kuota --------------------
def test_quota_lookup_per_tier():
    assert quota.quota("notebook.max_notebooks", "pemula") == 3
    assert quota.quota("notebook.max_notebooks", "lanjut") == 50
    assert quota.quota("inference.per_hour", "menengah") == 500
    assert quota.quota("notebook.runtime", "pemula") == "browser"


def test_quota_fallback_unknown_tier():
    # tier tak dikenal → fallback ke default (pemula)
    assert quota.quota("ai.messages_per_day", "tak-ada") == 20


def test_matrix_covers_all_tiers():
    # tiap baris harus mencakup semua tier kanonik (cegah lubang konfigurasi)
    assert quota.validate_matrix() == []


# -------------------- pengecek generik --------------------
def test_check_and_consume_enforces_limit():
    store = quota.InMemoryWindowStore()
    # ai.messages_per_day pemula = 20
    for _ in range(20):
        quota.check_and_consume(store, "ai.messages_per_day", "u1", "pemula")
    with pytest.raises(quota.QuotaExceeded):
        quota.check_and_consume(store, "ai.messages_per_day", "u1", "pemula")


def test_check_and_consume_rejects_non_numeric():
    store = quota.InMemoryWindowStore()
    with pytest.raises(ValueError):
        quota.check_and_consume(store, "notebook.runtime", "u1", "pemula")


def test_higher_tier_more_quota():
    store = quota.InMemoryWindowStore()
    # lanjut = 500/hari → 21 panggilan masih jauh dari batas
    for _ in range(21):
        r = quota.check_and_consume(store, "ai.messages_per_day", "u2", "lanjut")
    assert r["remaining"] == 500 - 21
