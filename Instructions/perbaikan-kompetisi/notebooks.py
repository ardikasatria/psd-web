"""Notebook kompetisi (urut favorit) & statistik kompetisi."""
from __future__ import annotations


def rank_by_favorites(notebooks: list[dict]) -> list[dict]:
    """Favorit terbanyak di atas; seri → yang terbaru diperbarui."""
    return sorted(
        notebooks,
        key=lambda n: (n.get("favorite_count", 0), n.get("updated_at", "")),
        reverse=True,
    )


def competition_stats(*, submissions: list[dict], notebooks: list[dict],
                      participants: list, teams: list) -> dict:
    scored = sum(1 for s in submissions if s.get("status") == "scored")
    pending = sum(1 for s in submissions
                  if s.get("status") in ("submitted", "under_review"))
    return {
        "participants": len(set(participants)),
        "teams": len(teams),
        "submissions": len(submissions),
        "scored": scored,
        "pending_review": pending,
        "notebooks": len(notebooks),
    }
