"""Profil afinitas dari activity-summary (Langkah 35 → 57)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class AffinityProfile:
    categories: dict[str, float]
    tags: dict[str, float]
    total: int

    def is_cold(self, min_events: int = 5) -> bool:
        return self.total < min_events


def _normalize(d: dict[str, float]) -> dict[str, float]:
    s = sum(d.values()) or 1.0
    return {k: v / s for k, v in d.items()}


def build_affinity(activity_summary: dict) -> AffinityProfile:
    cats = dict(activity_summary.get("categories", {}))
    tags = dict(activity_summary.get("tags", {}))
    total = int(activity_summary.get("event_count", sum(cats.values()) or 0))
    return AffinityProfile(_normalize(cats), _normalize(tags), total)


def from_psd_activity_summary(raw: dict) -> dict:
    """Adaptasi bentuk Langkah 35 → scaffold afinitas."""
    cats = {c["slug"]: int(c["count"]) for c in raw.get("top_categories", []) if c.get("slug")}
    tags = {t["tag"]: int(t["count"]) for t in raw.get("top_tags", []) if t.get("tag")}
    actions = raw.get("actions") or {}
    event_count = int(sum(actions.values()) or sum(cats.values()) or 0)
    return {"categories": cats, "tags": tags, "event_count": event_count}
