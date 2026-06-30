"""
LAPORKAN KONTEN melanggar: postingan feed, komentar, dan forum (thread/reply).

- target_key      : validasi & kunci polimorfik "<kind>:<id>".
- validate_reason : taksonomi alasan.
- add_report      : satu laporan per pelapor (dedup); agregasi jumlah pelapor.
- should_auto_flag: tandai untuk moderator saat jumlah pelapor ≥ ambang.
- moderasi        : pending → reviewing → resolved (dengan keputusan/aksi).
"""
from __future__ import annotations

# Jenis konten yang bisa dilaporkan (feed & forum).
REPORTABLE_KINDS = {"post", "feed", "comment", "thread", "reply"}

REASONS = {"spam", "pelecehan", "kebencian", "seksual", "kekerasan",
           "misinformasi", "menyesatkan", "ilegal", "lainnya"}

# Status moderasi laporan.
PENDING = "pending"
REVIEWING = "reviewing"
RESOLVED = "resolved"

# Keputusan/aksi moderator saat menyelesaikan.
DECISIONS = {"dismiss", "remove", "warn", "ban", "lock"}

_TRANSITIONS = {"start_review": {PENDING}, "resolve": {PENDING, REVIEWING},
                "reopen": {RESOLVED}}
_RESULT = {"start_review": REVIEWING, "resolve": RESOLVED, "reopen": REVIEWING}


class ReportError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def is_reportable(kind: str) -> bool:
    return kind in REPORTABLE_KINDS


def target_key(kind: str, target_id: str) -> str:
    if not is_reportable(kind):
        raise ReportError(422, "not_reportable", f"Jenis tak bisa dilaporkan: {kind}")
    return f"{kind}:{target_id}"


def validate_reason(reason: str) -> str:
    if reason not in REASONS:
        raise ReportError(422, "bad_reason", f"Alasan tak dikenal: {reason}")
    return reason


def add_report(reporter_ids: set[str], reporter_id: str) -> tuple[set[str], bool]:
    """Tambah pelapor; satu laporan per pengguna (dedup). Return (set_baru, ditambahkan?)."""
    s = set(reporter_ids)
    if reporter_id in s:
        return s, False
    s.add(reporter_id)
    return s, True


def report_count(reporter_ids: set[str]) -> int:
    return len(reporter_ids)


def should_auto_flag(count: int, threshold: int) -> bool:
    return count >= threshold


def apply_action(current: str, action: str) -> str:
    if current not in _TRANSITIONS.get(action, set()):
        raise ReportError(409, "invalid_transition", f"Tak bisa '{action}' dari '{current}'.")
    return _RESULT[action]


def validate_decision(decision: str) -> str:
    if decision not in DECISIONS:
        raise ReportError(422, "bad_decision", f"Keputusan tak dikenal: {decision}")
    return decision
