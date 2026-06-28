"""Preferensi email pengguna (Langkah 59)."""
from __future__ import annotations

from app.email.events import EmailMode, default_mode
from app.modules.users.settings import merged

# Legacy notification toggles → event types
_LEGACY_OFF: dict[str, list[str]] = {
    "email_competition": ["competition", "competition_result"],
    "email_event_reminder": ["event"],
    "email_forum_reply": ["comment", "pr_commented"],
}


def user_email_prefs(user_settings: dict | None) -> dict:
    """Return {email_enabled, default_mode, events}."""
    m = merged(user_settings)
    email_sec = dict(m.get("email") or {})
    notif = m.get("notifications") or {}
    events: dict[str, EmailMode] = dict(email_sec.get("events") or {})

    for legacy_key, event_types in _LEGACY_OFF.items():
        if not notif.get(legacy_key, True):
            for et in event_types:
                events.setdefault(et, "off")

    return {
        "email_enabled": bool(email_sec.get("email_enabled", True)),
        "default_mode": email_sec.get("default_mode", "immediate"),
        "events": events,
    }


def resolve_mode(prefs: dict, event_type: str) -> EmailMode:
    if not prefs.get("email_enabled", True):
        return "off"
    mode = prefs.get("events", {}).get(event_type)
    if mode:
        return mode  # type: ignore[return-value]
    fallback = prefs.get("default_mode", "immediate")
    if fallback in ("immediate", "digest", "off"):
        return fallback  # type: ignore[return-value]
    return default_mode(event_type)


def should_send_now(prefs: dict, event_type: str) -> bool:
    return resolve_mode(prefs, event_type) == "immediate"


def should_digest(prefs: dict, event_type: str) -> bool:
    return resolve_mode(prefs, event_type) == "digest"
