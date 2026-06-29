"""Uji counter engagement."""
import pytest

from app.modules.engagement import counters
from app.modules.engagement.counters import AssetCounters, UserSummary


def test_apply_love_toggle_and_clamp():
    a, s = AssetCounters(), UserSummary()
    counters.apply_love(a, s, loved=True)
    assert a.love_count == 1 and s.total_loves_received == 1
    counters.apply_love(a, s, loved=False)
    assert a.love_count == 0 and s.total_loves_received == 0


def test_apply_share_channels():
    a, s = AssetCounters(), UserSummary()
    counters.apply_share(a, s, channel="feed")
    counters.apply_share(a, s, channel="link")
    assert a.share_count == 2 and s.total_shares == 2


def test_recompute_user_summary():
    a1 = AssetCounters(love_count=10, download_count=3)
    a1.shares["feed"] = 2
    a2 = AssetCounters(love_count=5)
    s = counters.recompute_user_summary([a1, a2])
    assert s.total_loves_received == 15
    assert s.total_shares == 2
    assert s.asset_count == 2
