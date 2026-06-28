"""Feed personal & langkah berikutnya (Langkah 57)."""
from __future__ import annotations


def next_steps(state: dict) -> list[dict]:
    out: list[dict] = []
    if state.get("completed_courses", 0) > 0 and state.get("joined_competitions", 0) == 0:
        out.append(
            {
                "action": "join_competition",
                "text": "Ikuti kompetisi pertama Anda untuk membuktikan keterampilan.",
                "href": "/competitions",
            }
        )
    if not state.get("has_published_dataset"):
        out.append(
            {
                "action": "publish_dataset",
                "text": "Publikasikan dataset pertama Anda.",
                "href": "/datasets/new",
            }
        )
    nt = state.get("next_tier_points")
    if nt is not None and state.get("points", 0) >= nt:
        out.append(
            {
                "action": "tier_up",
                "text": "Anda memenuhi syarat naik tier reputasi.",
                "href": "/leaderboard",
            }
        )
    return out


def build_feed(recommendations: dict[str, list], steps: list[dict]) -> list[dict]:
    feed: list[dict] = []
    if steps:
        feed.append({"type": "next_steps", "title": "Langkah berikutnya", "items": steps})
    titles = {
        "dataset": "Dataset untuk Anda",
        "course": "Course yang cocok",
        "kompetisi": "Kompetisi relevan",
        "ruang": "Ruang yang mungkin menarik",
    }
    for kind, items in recommendations.items():
        if items:
            feed.append(
                {
                    "type": "recommendation",
                    "kind": kind,
                    "title": titles.get(kind, kind),
                    "items": items,
                }
            )
    return feed
