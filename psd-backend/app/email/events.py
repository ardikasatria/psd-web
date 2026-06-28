"""Katalog peristiwa email (Langkah 59)."""
from __future__ import annotations

from typing import Literal

EmailMode = Literal["immediate", "digest", "off"]

# Default mode per event type (brief §6).
EVENT_DEFAULTS: dict[str, EmailMode] = {
    # Fase 0
    "welcome": "immediate",
    "course_published": "immediate",
    "course_enrolled": "immediate",
    "quiz_graded": "immediate",
    "competition_result": "immediate",
    "competition": "immediate",
    "dataset_published": "immediate",
    "marketplace_match": "immediate",
    "notification_generic": "digest",
    "event": "immediate",
    "course": "immediate",
    "instructor": "immediate",
    # Fase 1
    "pr_opened": "immediate",
    "pr_reviewed": "immediate",
    "pr_merged": "immediate",
    "pr_commented": "digest",
    "drift_alert": "immediate",
    "model_promoted": "immediate",
    "quota_warning": "immediate",
    # Social / platform
    "follow": "digest",
    "post_like": "digest",
    "comment": "digest",
    "room": "immediate",
    "team": "immediate",
}


def default_mode(event_type: str) -> EmailMode:
    return EVENT_DEFAULTS.get(event_type, "immediate")
