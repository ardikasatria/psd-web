"""
Preferensi email per pengguna (opt-in/out).

prefs = {
  'email_enabled': bool,                 # unsubscribe global
  'default_mode': 'immediate'|'digest'|'off',
  'events': { '<event_type>': 'immediate'|'digest'|'off', ... },
}
"""
from __future__ import annotations

from .events import event_mode


def resolve_mode(prefs: dict, event_type: str) -> str:
    if not prefs.get("email_enabled", True):
        return "off"                       # unsubscribe global
    events = prefs.get("events", {})
    if event_type in events:
        return events[event_type]
    return prefs.get("default_mode") or event_mode(event_type)


def should_send_now(prefs: dict, event_type: str) -> bool:
    """True hanya untuk mode 'immediate'. 'digest' ditangani job harian; 'off' diabaikan."""
    return resolve_mode(prefs, event_type) == "immediate"


def should_digest(prefs: dict, event_type: str) -> bool:
    return resolve_mode(prefs, event_type) == "digest"
