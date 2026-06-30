"""Notebook kompetisi & statistik."""
from __future__ import annotations

from app.modules.competitions.submission_review import SCORED, SUBMITTED, UNDER_REVIEW


def rank_by_favorites(notebooks: list[dict]) -> list[dict]:
    return sorted(
        notebooks,
        key=lambda n: (n.get("favorite_count", 0), n.get("updated_at", "")),
        reverse=True,
    )


def competition_stats(*, submissions: list[dict], notebooks: list[dict], participants: list, teams: list) -> dict:
    scored = sum(1 for s in submissions if s.get("status") == SCORED)
    pending = sum(1 for s in submissions if s.get("status") in (SUBMITTED, UNDER_REVIEW))
    return {
        "participants": len(set(participants)),
        "teams": len(teams),
        "submissions": len(submissions),
        "scored": scored,
        "pending_review": pending,
        "notebooks": len(notebooks),
    }
