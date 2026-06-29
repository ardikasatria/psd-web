"""
State panel asisten untuk frontend.

PENTING: panel ini TIDAK menyertakan rekomendasi (sesuai keputusan desain). Hanya:
kuota (gaya jam) + batas memori/histori + status kirim & pesan peringatan.
"""
from __future__ import annotations

from datetime import datetime

from . import history, window_quota


def _fmt_reset(reset_at: datetime | None, now: datetime) -> str | None:
    if reset_at is None:
        return None
    secs = max(0, int((reset_at - now).total_seconds()))
    h, m = secs // 3600, (secs % 3600) // 60
    if h > 0:
        return f"{h} jam {m} menit"
    return f"{m} menit"


def panel_state(window_state, now: datetime, *, tier: str) -> dict:
    q = window_quota.view(window_state, now, tier=tier)
    ctx_max, hist_max = history.memory_limits_for(tier)
    warning = None
    if not q.can_send:
        in_text = _fmt_reset(q.reset_at, now)
        warning = ("Kuota chat Anda habis."
                   + (f" Kuota pulih dalam {in_text}." if in_text else "")
                   + " Tingkatkan tier untuk kuota lebih besar.")
    return {
        "quota": {
            "can_send": q.can_send,
            "used": q.used,
            "remaining": q.remaining,
            "limit": q.limit,
            "window_hours": q.window_hours,
            "reset_at": q.reset_at.isoformat() if q.reset_at else None,
        },
        "memory": {"max_context_messages": ctx_max, "max_history_conversations": hist_max},
        "send_disabled": not q.can_send,
        "warning": warning,
        # tanpa 'recommendations' — sengaja dihilangkan dari panel asisten.
    }
