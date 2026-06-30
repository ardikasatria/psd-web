"""Uji logika kompetisi (gaya Kaggle)."""
from datetime import datetime, timedelta, timezone

import pytest

from app.modules.competitions import comp_notebooks, deadline, submission_review
from app.modules.competitions.submission_review import ReviewError

T0 = datetime(2026, 6, 1, tzinfo=timezone.utc)
DL = datetime(2026, 6, 11, tzinfo=timezone.utc)


def test_deadline_phases_and_progress():
    up = deadline.progress(T0, DL, T0 - timedelta(days=1))
    assert up["phase"] == "upcoming" and up["progress"] == 0.0 and up["is_open"] is False
    mid = deadline.progress(T0, DL, T0 + timedelta(days=5))
    assert mid["phase"] == "active" and mid["progress"] == 0.5 and mid["is_open"] is True
    assert "hari" in mid["remaining_text"]
    end = deadline.progress(T0, DL, DL + timedelta(hours=1))
    assert end["phase"] == "ended" and end["progress"] == 1.0 and end["remaining_seconds"] == 0


def test_review_transitions():
    assert submission_review.apply_action("submitted", "start_review") == "under_review"
    assert submission_review.apply_action("under_review", "score") == "scored"
    assert submission_review.apply_action("submitted", "reject") == "rejected"
    assert submission_review.apply_action("scored", "reopen") == "under_review"
    with pytest.raises(ReviewError) as e:
        submission_review.apply_action("scored", "score")
    assert e.value.status == 409


def test_validate_score():
    assert submission_review.validate_score(87.5, max_score=100) == 87.5
    for bad in [True, "x", -1]:
        with pytest.raises(ReviewError):
            submission_review.validate_score(bad, max_score=100)
    with pytest.raises(ReviewError):
        submission_review.validate_score(120, max_score=100)


def _sub(id, score, team=None, user=None, at="2026-06-05", status="scored"):
    return {
        "id": id,
        "score": score,
        "team_id": team,
        "user_id": user,
        "submitted_at": at,
        "status": status,
    }


def test_leaderboard_maximize_best_per_team():
    subs = [
        _sub("a", 90, team="t1", at="2026-06-05"),
        _sub("b", 95, team="t1", at="2026-06-06"),
        _sub("c", 92, team="t2", at="2026-06-04"),
        _sub("d", 50, user="u9", at="2026-06-03", status="under_review"),
    ]
    lb = submission_review.leaderboard(subs, higher_is_better=True)
    assert [r["id"] for r in lb] == ["b", "c"]
    assert lb[0]["rank"] == 1 and lb[0]["score"] == 95


def test_leaderboard_minimize_rmse_and_tiebreak():
    subs = [
        _sub("a", 0.30, user="u1", at="2026-06-05"),
        _sub("b", 0.20, user="u2", at="2026-06-06"),
        _sub("c", 0.20, user="u3", at="2026-06-04"),
    ]
    lb = submission_review.leaderboard(subs, higher_is_better=False)
    assert [r["id"] for r in lb] == ["c", "b", "a"]
    assert lb[0]["rank"] == 1


def test_rank_notebooks_by_favorites():
    nbs = [
        {"id": "n1", "favorite_count": 3, "updated_at": "2026-06-01"},
        {"id": "n2", "favorite_count": 10, "updated_at": "2026-06-02"},
        {"id": "n3", "favorite_count": 10, "updated_at": "2026-06-05"},
    ]
    out = comp_notebooks.rank_by_favorites(nbs)
    assert [n["id"] for n in out] == ["n3", "n2", "n1"]


def test_competition_stats():
    subs = [_sub("a", 90, team="t1"), _sub("b", None, user="u1", status="submitted")]
    st = comp_notebooks.competition_stats(
        submissions=subs,
        notebooks=[{"id": "n1"}],
        participants=["u1", "u2", "u1"],
        teams=["t1"],
    )
    assert st == {
        "participants": 2,
        "teams": 1,
        "submissions": 2,
        "scored": 1,
        "pending_review": 1,
        "notebooks": 1,
    }
