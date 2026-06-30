"""Uji pengaduan platform & laporan konten."""
import pytest

from app.reports import content_reports as cr
from app.reports import queue, tickets
from app.reports.content_reports import ReportError
from app.reports.tickets import TicketError


# -------------------- tiket pengaduan --------------------
def test_ticket_lifecycle():
    assert tickets.apply_action("open", "start") == "in_progress"
    assert tickets.apply_action("in_progress", "resolve") == "resolved"
    assert tickets.apply_action("resolved", "close") == "closed"
    assert tickets.apply_action("closed", "reopen") == "in_progress"
    with pytest.raises(TicketError) as e:
        tickets.apply_action("closed", "resolve")
    assert e.value.status == 409


def test_ticket_validation():
    assert tickets.validate_category("bug") == "bug"
    assert tickets.validate_priority("kritis") == "kritis"
    for bad in [("validate_category", "spam"), ("validate_priority", "urgent")]:
        with pytest.raises(TicketError):
            getattr(tickets, bad[0])(bad[1])


# -------------------- laporan konten --------------------
def test_target_key_and_reason():
    assert cr.target_key("post", "p1") == "post:p1"
    assert cr.target_key("thread", "t9") == "thread:t9"     # forum
    assert cr.is_reportable("feed") is True
    with pytest.raises(ReportError):
        cr.target_key("user", "u1")                          # bukan konten yang bisa dilaporkan
    assert cr.validate_reason("spam") == "spam"
    with pytest.raises(ReportError):
        cr.validate_reason("tidak-suka")


def test_report_dedup_and_count():
    s = set()
    s, added = cr.add_report(s, "u1")
    assert added is True and cr.report_count(s) == 1
    s, added = cr.add_report(s, "u1")                        # pelapor sama → tak dihitung lagi
    assert added is False and cr.report_count(s) == 1
    s, _ = cr.add_report(s, "u2")
    assert cr.report_count(s) == 2


def test_auto_flag_threshold():
    assert cr.should_auto_flag(2, 3) is False
    assert cr.should_auto_flag(3, 3) is True


def test_moderation_state_machine_and_decision():
    assert cr.apply_action("pending", "start_review") == "reviewing"
    assert cr.apply_action("reviewing", "resolve") == "resolved"
    assert cr.apply_action("pending", "resolve") == "resolved"
    assert cr.apply_action("resolved", "reopen") == "reviewing"
    with pytest.raises(ReportError):
        cr.apply_action("resolved", "start_review")
    assert cr.validate_decision("remove") == "remove"
    with pytest.raises(ReportError):
        cr.validate_decision("delete_user")


# -------------------- antrian --------------------
def test_sort_tickets_priority_then_age():
    ts = [
        {"id": "a", "priority": "rendah", "created_at": "2026-06-01"},
        {"id": "b", "priority": "kritis", "created_at": "2026-06-03"},
        {"id": "c", "priority": "kritis", "created_at": "2026-06-02"},
        {"id": "d", "priority": "sedang", "created_at": "2026-06-01"},
    ]
    assert [t["id"] for t in queue.sort_tickets(ts)] == ["c", "b", "d", "a"]


def test_sort_moderation_flagged_then_count_then_age():
    rs = [
        {"id": "r1", "flagged": False, "report_count": 5, "created_at": "2026-06-01"},
        {"id": "r2", "flagged": True, "report_count": 3, "created_at": "2026-06-02"},
        {"id": "r3", "flagged": True, "report_count": 8, "created_at": "2026-06-03"},
    ]
    assert [r["id"] for r in queue.sort_moderation(rs)] == ["r3", "r2", "r1"]
