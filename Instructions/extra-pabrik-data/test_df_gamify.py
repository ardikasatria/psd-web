"""Uji gamifikasi Pabrik Data (batas engine + poin + quest)."""
import pytest

from app.df_gamify import limits, points, quests
from app.df_gamify.limits import LimitError


# -------------------- batas engine per tier --------------------
def test_engine_locked_for_pemula_spark():
    with pytest.raises(LimitError) as e:
        limits.check_engine_allowed("pemula", "spark")
    assert e.value.status == 403
    limits.check_engine_allowed("pemula", "duckdb")            # duckdb boleh


def test_raw_capabilities_per_tier():
    assert limits.can_use_raw_sql("pemula", "duckdb") is False
    assert limits.can_use_raw_sql("menengah", "duckdb") is True
    assert limits.can_use_raw_code("menengah", "spark") is False   # kode .py belum
    assert limits.can_use_raw_code("lanjut", "spark") is True      # kode .py di lanjut


def test_run_quota_and_data_size():
    with pytest.raises(LimitError) as e1:
        limits.check_run_quota("pemula", "duckdb", runs_today=5)   # batas 5
    assert e1.value.status == 429
    limits.check_run_quota("pemula", "duckdb", runs_today=4)       # masih boleh
    with pytest.raises(LimitError) as e2:
        limits.check_data_size("pemula", "duckdb", est_bytes=300_000_000)  # >200MB
    assert e2.value.status == 413


# -------------------- poin --------------------
def test_points_for_activities():
    assert points.points_for("df_pipeline_run_success") == 10
    assert points.points_for("df_spark_run_success") == 20
    assert points.award("df_sql_node_used", count=3) == 9
    assert points.points_for("tak_ada") == 0


# -------------------- quest --------------------
def test_quest_progress_and_completion():
    q = {"id": "q1", "title": "SQL", "criteria": {"df_sql_node_used": 3}, "reward_points": 30}
    counters = {}
    counters = quests.apply_event(counters, "df_sql_node_used")
    counters = quests.apply_event(counters, "df_sql_node_used")
    pr = quests.progress(q, counters)
    assert pr["completed"] is False and pr["percent"] == round(2 / 3, 4)
    counters = quests.apply_event(counters, "df_sql_node_used")
    assert quests.is_complete(q, counters) is True


def test_quest_claimable_once():
    q = {"id": "q1", "criteria": {"df_spark_run_success": 1}, "reward_points": 50}
    counters = quests.apply_event({}, "df_spark_run_success")
    assert quests.claimable(q, counters, claimed_ids=[]) is True
    assert quests.claimable(q, counters, claimed_ids=["q1"]) is False   # sudah diklaim
    assert quests.reward_points(q) == 50


def test_seed_quests_present():
    ids = {q["id"] for q in quests.DF_QUESTS}
    assert {"df_first_pipeline", "df_go_spark", "df_data_producer"} <= ids
