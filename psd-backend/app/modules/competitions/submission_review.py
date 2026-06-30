"""Alur penilaian admin + leaderboard kompetisi."""
from __future__ import annotations

SUBMITTED = "submitted"
UNDER_REVIEW = "under_review"
SCORED = "scored"
REJECTED = "rejected"

_TRANSITIONS = {
    "start_review": {SUBMITTED},
    "score": {SUBMITTED, UNDER_REVIEW},
    "reject": {SUBMITTED, UNDER_REVIEW},
    "reopen": {SCORED, REJECTED},
}
_RESULT = {
    "start_review": UNDER_REVIEW,
    "score": SCORED,
    "reject": REJECTED,
    "reopen": UNDER_REVIEW,
}


class ReviewError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def apply_action(current: str, action: str) -> str:
    if current not in _TRANSITIONS.get(action, set()):
        raise ReviewError(409, "invalid_transition", f"Tak bisa '{action}' dari '{current}'.")
    return _RESULT[action]


def validate_score(score, *, min_score: float = 0.0, max_score: float | None = None) -> float:
    if isinstance(score, bool) or not isinstance(score, (int, float)):
        raise ReviewError(422, "bad_score", "Skor harus angka.")
    if score < min_score:
        raise ReviewError(422, "score_range", f"Skor minimal {min_score}.")
    if max_score is not None and score > max_score:
        raise ReviewError(422, "score_range", f"Skor maksimal {max_score}.")
    return float(score)


def _entrant_key(s: dict):
    return s.get("team_id") or s.get("user_id")


def _sort_key(s: dict, higher_is_better: bool):
    sc = s["score"]
    return (-sc if higher_is_better else sc, s.get("submitted_at") or s.get("created_at") or "")


def best_per_entrant(submissions: list[dict], *, higher_is_better: bool = True) -> dict:
    best: dict = {}
    for s in submissions:
        if s.get("status") != SCORED or s.get("score") is None:
            continue
        k = _entrant_key(s)
        if k not in best or _sort_key(s, higher_is_better) < _sort_key(best[k], higher_is_better):
            best[k] = s
    return best


def leaderboard(submissions: list[dict], *, higher_is_better: bool = True) -> list[dict]:
    best = best_per_entrant(submissions, higher_is_better=higher_is_better)
    ranked = sorted(best.values(), key=lambda s: _sort_key(s, higher_is_better))
    return [{**s, "rank": i + 1} for i, s in enumerate(ranked)]
