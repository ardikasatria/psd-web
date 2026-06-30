"""
Progres menuju deadline kompetisi: fase (upcoming/active/ended), fraksi bar progres,
dan sisa waktu (untuk hitung mundur).
"""
from __future__ import annotations

from datetime import datetime


def _human(secs: int) -> str:
    d, h, m = secs // 86400, (secs % 86400) // 3600, (secs % 3600) // 60
    if d > 0:
        return f"{d} hari {h} jam"
    if h > 0:
        return f"{h} jam {m} menit"
    return f"{m} menit"


def progress(start: datetime, deadline: datetime, now: datetime) -> dict:
    if now < start:
        phase, frac = "upcoming", 0.0
    elif now >= deadline:
        phase, frac = "ended", 1.0
    else:
        total = (deadline - start).total_seconds()
        phase = "active"
        frac = (now - start).total_seconds() / total if total > 0 else 1.0
    remaining = max(0, int((deadline - now).total_seconds()))
    return {
        "phase": phase,
        "progress": round(min(1.0, max(0.0, frac)), 4),
        "remaining_seconds": remaining,
        "remaining_text": _human(remaining) if phase != "ended" else "Selesai",
        "is_open": phase == "active",
    }
