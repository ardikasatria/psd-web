"""Uji pengaduan platform & laporan konten."""
import pytest

from app.modules.reports import content_reports as cr
from app.modules.reports import queue as report_queue
from app.modules.support import queue as ticket_queue
from app.modules.support import tickets
from app.modules.reports.content_reports import ReportError
from app.modules.support.tickets import TicketError


def test_ticket_lifecycle():
    assert tickets.apply_action("open", "start") == "in_progress"
    assert tickets.apply_action("in_progress", "resolve") == "resolved"
    assert tickets.apply_action("resolved", "close") == "closed"
    assert tickets.apply_action("closed", "reopen") == "in_progress"
    with pytest.raises(TicketError):
        tickets.apply_action("closed", "resolve")


def test_ticket_validation():
    assert tickets.validate_category("bug") == "bug"
    assert tickets.validate_priority("kritis") == "kritis"
    with pytest.raises(TicketError):
        tickets.validate_category("spam")
    with pytest.raises(TicketError):
        tickets.validate_priority("urgent")


def test_target_key_and_reason():
    assert cr.target_key("post", "p1") == "post:p1"
    assert cr.target_key("thread", "t9") == "thread:t9"
    assert cr.is_reportable("feed") is True
    with pytest.raises(ReportError):
        cr.target_key("user", "u1")
    assert cr.validate_reason("spam") == "spam"
    with pytest.raises(ReportError):
        cr.validate_reason("tidak-suka")


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


def test_sort_tickets_priority_then_age():
    ts = [
        {"id": "a", "priority": "rendah", "created_at": "2026-06-01"},
        {"id": "b", "priority": "kritis", "created_at": "2026-06-03"},
        {"id": "c", "priority": "kritis", "created_at": "2026-06-02"},
        {"id": "d", "priority": "sedang", "created_at": "2026-06-01"},
    ]
    assert [t["id"] for t in ticket_queue.sort_tickets(ts)] == ["c", "b", "d", "a"]


def test_sort_moderation_flagged_then_count_then_age():
    rs = [
        {"id": "r1", "flagged": False, "report_count": 5, "created_at": "2026-06-01"},
        {"id": "r2", "flagged": True, "report_count": 3, "created_at": "2026-06-02"},
        {"id": "r3", "flagged": True, "report_count": 8, "created_at": "2026-06-03"},
    ]
    assert [r["id"] for r in report_queue.sort_moderation(rs)] == ["r3", "r2", "r1"]
