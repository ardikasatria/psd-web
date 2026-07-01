"""
Ruang Panen Data — siklus job panen (scraping API eksternal → dataset).

Status: draft → queued → running → completed | failed | canceled (retry → queued).
"""
from __future__ import annotations

DRAFT = "draft"
QUEUED = "queued"
RUNNING = "running"
COMPLETED = "completed"
FAILED = "failed"
CANCELED = "canceled"

_TRANSITIONS = {
    "queue": {DRAFT, FAILED, CANCELED},
    "start": {QUEUED},
    "complete": {RUNNING},
    "fail": {QUEUED, RUNNING},
    "cancel": {DRAFT, QUEUED, RUNNING},
    "retry": {FAILED, CANCELED},
}
_RESULT = {"queue": QUEUED, "start": RUNNING, "complete": COMPLETED,
           "fail": FAILED, "cancel": CANCELED, "retry": QUEUED}


class HarvestError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def apply_action(current: str, action: str) -> str:
    if current not in _TRANSITIONS.get(action, set()):
        raise HarvestError(409, "invalid_transition", f"Tak bisa '{action}' dari '{current}'.")
    return _RESULT[action]
