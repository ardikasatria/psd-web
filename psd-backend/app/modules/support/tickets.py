"""Tiket pengaduan platform — state machine."""
from __future__ import annotations

CATEGORIES = {"bug", "error", "akun", "data", "fitur", "lainnya"}
PRIORITIES = {"rendah", "sedang", "tinggi", "kritis"}

OPEN = "open"
IN_PROGRESS = "in_progress"
RESOLVED = "resolved"
CLOSED = "closed"

_TRANSITIONS = {
    "assign": {OPEN, IN_PROGRESS},
    "start": {OPEN, IN_PROGRESS},
    "resolve": {OPEN, IN_PROGRESS},
    "close": {OPEN, IN_PROGRESS, RESOLVED},
    "reopen": {RESOLVED, CLOSED},
}
_RESULT = {
    "assign": IN_PROGRESS,
    "start": IN_PROGRESS,
    "resolve": RESOLVED,
    "close": CLOSED,
    "reopen": IN_PROGRESS,
}


class TicketError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def validate_category(c: str) -> str:
    if c not in CATEGORIES:
        raise TicketError(422, "bad_category", f"Kategori tak dikenal: {c}")
    return c


def validate_priority(p: str) -> str:
    if p not in PRIORITIES:
        raise TicketError(422, "bad_priority", f"Prioritas tak dikenal: {p}")
    return p


def apply_action(current: str, action: str) -> str:
    if current not in _TRANSITIONS.get(action, set()):
        raise TicketError(409, "invalid_transition", f"Tak bisa '{action}' dari '{current}'.")
    return _RESULT[action]
