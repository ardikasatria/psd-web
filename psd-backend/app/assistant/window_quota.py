"""Kuota chat berbasis jendela jam (gaya Claude)."""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta

TIER_LIMITS: dict[str, tuple[int, int]] = {
    "pemula": (10, 5),
    "menengah": (50, 5),
    "lanjut": (200, 5),
}
DEFAULT_TIER = "pemula"


def limits_for(tier: str) -> tuple[int, int]:
    return TIER_LIMITS.get((tier or "").lower(), TIER_LIMITS[DEFAULT_TIER])


@dataclass
class WindowState:
    window_start: datetime | None = None
    count: int = 0


@dataclass
class QuotaView:
    can_send: bool
    used: int
    remaining: int
    limit: int
    window_hours: int
    reset_at: datetime | None


def _expired(state: WindowState, now: datetime, window_hours: int) -> bool:
    return state.window_start is None or now >= state.window_start + timedelta(hours=window_hours)


def view(state: WindowState, now: datetime, *, tier: str) -> QuotaView:
    limit, hours = limits_for(tier)
    if _expired(state, now, hours):
        return QuotaView(
            can_send=limit > 0,
            used=0,
            remaining=limit,
            limit=limit,
            window_hours=hours,
            reset_at=None,
        )
    reset_at = state.window_start + timedelta(hours=hours)
    remaining = max(0, limit - state.count)
    return QuotaView(
        can_send=remaining > 0,
        used=state.count,
        remaining=remaining,
        limit=limit,
        window_hours=hours,
        reset_at=reset_at,
    )


def consume(state: WindowState, now: datetime, *, tier: str) -> tuple[WindowState, QuotaView]:
    limit, hours = limits_for(tier)
    if _expired(state, now, hours):
        state = WindowState(window_start=now, count=0)
    reset_at = state.window_start + timedelta(hours=hours)
    if state.count >= limit:
        return state, QuotaView(
            can_send=False,
            used=state.count,
            remaining=0,
            limit=limit,
            window_hours=hours,
            reset_at=reset_at,
        )
    new_state = WindowState(window_start=state.window_start, count=state.count + 1)
    return new_state, QuotaView(
        can_send=True,
        used=new_state.count,
        remaining=limit - new_state.count,
        limit=limit,
        window_hours=hours,
        reset_at=reset_at,
    )
