"""Uji statistik engagement."""
import pytest

from app.engagement import counters, service
from app.engagement.counters import AssetCounters, UserSummary
from app.engagement.service import EngagementError


# -------------------- counter murni --------------------
def test_apply_love_toggle_and_clamp():
    a, s = AssetCounters(), UserSummary()
    counters.apply_love(a, s, loved=True)
    assert a.love_count == 1 and s.total_loves_received == 1
    counters.apply_love(a, s, loved=False)
    assert a.love_count == 0 and s.total_loves_received == 0
    counters.apply_love(a, s, loved=False)        # tak boleh negatif
    assert a.love_count == 0 and s.total_loves_received == 0


def test_apply_share_channels_and_total():
    a, s = AssetCounters(), UserSummary()
    counters.apply_share(a, s, channel="feed")
    counters.apply_share(a, s, channel="external")
    counters.apply_share(a, s, channel="feed")
    assert a.shares["feed"] == 2 and a.shares["external"] == 1
    assert a.share_count == 3 and s.total_shares == 3
    with pytest.raises(counters.CounterError):
        counters.apply_share(a, s, channel="tiktok")


def test_apply_download():
    a, s = AssetCounters(), UserSummary()
    counters.apply_download(a, s)
    counters.apply_download(a, s)
    assert a.download_count == 2 and s.total_downloads == 2


def test_recompute_user_summary():
    a1 = AssetCounters(love_count=10, download_count=3)
    a1.shares["feed"] = 2
    a2 = AssetCounters(love_count=5)
    s = counters.recompute_user_summary([a1, a2])
    assert s.total_loves_received == 15
    assert s.total_shares == 2
    assert s.total_downloads == 3
    assert s.asset_count == 2


# -------------------- service --------------------
class FakeStore:
    def __init__(self):
        self.loves = set()
        self.assets = {}
        self.summaries = {}
    def has_loved(self, actor, key): return (actor, key) in self.loves
    def set_loved(self, actor, key, loved):
        self.loves.add((actor, key)) if loved else self.loves.discard((actor, key))
    def get_asset(self, key): return self.assets.setdefault(key, AssetCounters())
    def save_asset(self, key, a): self.assets[key] = a
    def get_summary(self, uid): return self.summaries.setdefault(uid, UserSummary())
    def save_summary(self, uid, s): self.summaries[uid] = s


class FakeGami:
    def __init__(self): self.awards = []; self.badges = []
    def award(self, uid, reason): self.awards.append((uid, reason))
    def badge(self, uid, bid): self.badges.append((uid, bid))


def test_toggle_love_flow_and_reputation():
    store, gami = FakeStore(), FakeGami()
    r1 = service.toggle_love(store, asset_key="dataset:iris", owner_id="owner",
                             actor_id="budi", gamification=gami)
    assert r1 == {"loved": True, "love_count": 1}
    assert ("owner", "like_received") in gami.awards
    # toggle lagi → batal suka
    r2 = service.toggle_love(store, asset_key="dataset:iris", owner_id="owner",
                             actor_id="budi", gamification=gami)
    assert r2["loved"] is False and r2["love_count"] == 0


def test_cannot_love_own_asset():
    store = FakeStore()
    with pytest.raises(EngagementError) as e:
        service.toggle_love(store, asset_key="dataset:x", owner_id="me", actor_id="me")
    assert e.value.status == 422 and e.value.slug == "cannot_love_own"


def test_badge_populer_at_50():
    store, gami = FakeStore(), FakeGami()
    store.assets["d:k"] = AssetCounters(love_count=49)
    service.toggle_love(store, asset_key="d:k", owner_id="o", actor_id="a", gamification=gami)
    assert ("o", "populer") in gami.badges


def test_record_share_and_download():
    store = FakeStore()
    rs = service.record_share(store, asset_key="model:m", owner_id="o", channel="forum")
    assert rs["share_count"] == 1 and rs["shares"]["forum"] == 1
    with pytest.raises(EngagementError):
        service.record_share(store, asset_key="model:m", owner_id="o", channel="salah")
    rd = service.record_download(store, asset_key="model:m", owner_id="o")
    assert rd["download_count"] == 1
    # ringkasan pemilik terjaga (sumber tunggal)
    assert store.get_summary("o").total_shares == 1
    assert store.get_summary("o").total_downloads == 1
