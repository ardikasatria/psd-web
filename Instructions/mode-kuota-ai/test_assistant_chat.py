"""Uji kuota asisten gaya Claude + histori + panel."""
from datetime import datetime, timedelta, timezone

from app.assistant import history, panel, window_quota
from app.assistant.window_quota import WindowState

NOW = datetime(2026, 6, 1, 12, 0, tzinfo=timezone.utc)


# -------------------- kuota jendela jam --------------------
def test_view_fresh_window_full():
    v = window_quota.view(WindowState(), NOW, tier="pemula")
    assert v.limit == 10 and v.remaining == 10 and v.can_send is True
    assert v.reset_at is None and v.window_hours == 5


def test_consume_increments_and_sets_reset():
    st = WindowState()
    st, v = window_quota.consume(st, NOW, tier="pemula")
    assert v.used == 1 and v.remaining == 9 and v.can_send is True
    assert v.reset_at == NOW + timedelta(hours=5)        # jendela mulai di pesan pertama


def test_consume_blocks_when_exhausted():
    st = WindowState(window_start=NOW, count=10)          # pemula limit 10
    st2, v = window_quota.consume(st, NOW + timedelta(hours=1), tier="pemula")
    assert v.can_send is False and v.remaining == 0
    assert v.reset_at == NOW + timedelta(hours=5)


def test_window_resets_after_hours():
    st = WindowState(window_start=NOW, count=10)
    later = NOW + timedelta(hours=5, minutes=1)           # jendela kedaluwarsa
    st2, v = window_quota.consume(st, later, tier="pemula")
    assert v.can_send is True and v.used == 1             # jendela baru
    assert v.reset_at == later + timedelta(hours=5)


def test_window_start_stable_within_window():
    st = WindowState()
    st, _ = window_quota.consume(st, NOW, tier="menengah")
    st, v = window_quota.consume(st, NOW + timedelta(hours=2), tier="menengah")
    assert v.used == 2 and v.reset_at == NOW + timedelta(hours=5)  # start tetap di pesan pertama


# -------------------- memori & histori --------------------
def test_trim_context_keeps_system_and_recent():
    msgs = [{"role": "system", "content": "s"}] + [{"role": "user", "content": str(i)} for i in range(20)]
    out = history.trim_context(msgs, max_messages=5)
    assert out[0]["role"] == "system"
    assert len(out) == 6                                  # system + 5 terakhir
    assert out[-1]["content"] == "19"


def test_trim_context_no_system():
    msgs = [{"role": "user", "content": str(i)} for i in range(8)]
    out = history.trim_context(msgs, max_messages=3)
    assert [m["content"] for m in out] == ["5", "6", "7"]


def test_prune_history_keeps_recent():
    convs = [{"id": i, "updated_at": f"2026-06-0{i}"} for i in range(1, 6)]
    kept = history.prune_history(convs, max_conversations=2)
    assert [c["id"] for c in kept] == [5, 4]


# -------------------- panel --------------------
def test_panel_no_recommendations_and_warning_when_empty():
    st = WindowState(window_start=NOW, count=10)          # habis
    p = panel.panel_state(st, NOW + timedelta(hours=1), tier="pemula")
    assert "recommendations" not in p                     # rekomendasi dihapus dari panel
    assert p["send_disabled"] is True
    assert p["quota"]["can_send"] is False
    assert "habis" in p["warning"].lower()
    assert "jam" in p["warning"]                          # info waktu reset


def test_panel_can_send_when_quota_available():
    p = panel.panel_state(WindowState(), NOW, tier="lanjut")
    assert p["send_disabled"] is False
    assert p["warning"] is None
    assert p["quota"]["limit"] == 200
    assert p["memory"]["max_context_messages"] == 40
