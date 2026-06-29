"""Uji koleksi aset disukai + visibilitas."""
import pytest

from app.liked import service, visibility
from app.liked.service import LikedError
from app.liked.visibility import LikedItem, LikedSettings


# -------------------- kelayakan aset --------------------
def test_is_asset_key_excludes_feed_forum():
    assert visibility.is_asset_key("dataset:iris") is True
    assert visibility.is_asset_key("model:bert") is True
    assert visibility.is_asset_key("post:123") is False     # feed
    assert visibility.is_asset_key("thread:9") is False      # forum
    assert visibility.is_asset_key("comment:1") is False
    assert visibility.is_asset_key("tanpa-titik") is False


# -------------------- visibilitas --------------------
def test_owner_sees_all_others_filtered():
    s = LikedSettings(list_public=True)
    pub = LikedItem("dataset:a", is_public=True)
    prv = LikedItem("dataset:b", is_public=False)
    # pemilik
    assert visibility.visible_to("u", "u", s, prv) is True
    # orang lain
    assert visibility.visible_to("x", "u", s, pub) is True
    assert visibility.visible_to("x", "u", s, prv) is False


def test_master_switch_hides_everything_for_others():
    s = LikedSettings(list_public=False)
    pub = LikedItem("dataset:a", is_public=True)
    assert visibility.visible_to("x", "u", s, pub) is False   # daftar privat
    assert visibility.visible_to("u", "u", s, pub) is True    # pemilik tetap lihat


def test_filter_and_public_count():
    s = LikedSettings(list_public=True)
    items = [LikedItem("dataset:a", True), LikedItem("dataset:b", False),
             LikedItem("model:c", True)]
    pub = visibility.filter_for_viewer("x", "u", s, items)
    assert [i.asset_key for i in pub] == ["dataset:a", "model:c"]
    assert visibility.public_count(s, items) == 2
    assert visibility.public_count(LikedSettings(list_public=False), items) == 0


# -------------------- service --------------------
class FakeStore:
    def __init__(self, items=None, settings=None):
        self._items = {i.asset_key: i for i in (items or [])}
        self._settings = settings or LikedSettings()
    def list_items(self, uid): return list(self._items.values())
    def get_item(self, uid, key): return self._items.get(key)
    def set_item_public(self, uid, key, pub):
        if key in self._items: self._items[key].is_public = pub
        else: self._items[key] = LikedItem(key, pub)
    def get_settings(self, uid): return self._settings
    def save_settings(self, uid, s): self._settings = s


def test_list_for_viewer_owner_vs_stranger():
    store = FakeStore([LikedItem("dataset:a", True), LikedItem("dataset:b", False)])
    own = service.list_for_viewer(store, user_id="u", viewer_id="u")
    assert len(own) == 2
    stranger = service.list_for_viewer(store, user_id="u", viewer_id="x")
    assert [i.asset_key for i in stranger] == ["dataset:a"]


def test_set_item_visibility_owner_only_and_asset_only():
    store = FakeStore([LikedItem("dataset:a", True)])
    r = service.set_item_visibility(store, user_id="u", actor_id="u",
                                    asset_key="dataset:a", is_public=False)
    assert r["is_public"] is False
    assert store.get_item("u", "dataset:a").is_public is False
    # bukan pemilik
    with pytest.raises(LikedError) as e1:
        service.set_item_visibility(store, user_id="u", actor_id="x",
                                    asset_key="dataset:a", is_public=True)
    assert e1.value.status == 403
    # bukan aset (feed/forum)
    with pytest.raises(LikedError) as e2:
        service.set_item_visibility(store, user_id="u", actor_id="u",
                                    asset_key="post:1", is_public=True)
    assert e2.value.status == 422
    # tak ada di daftar
    with pytest.raises(LikedError) as e3:
        service.set_item_visibility(store, user_id="u", actor_id="u",
                                    asset_key="dataset:zzz", is_public=True)
    assert e3.value.status == 404


def test_set_list_settings_and_summary():
    store = FakeStore([LikedItem("dataset:a", True), LikedItem("dataset:b", False)])
    s = service.set_list_settings(store, user_id="u", list_public=False)
    assert s.list_public is False
    summ = service.public_summary(store, user_id="u")
    assert summ == {"list_public": False, "public_count": 0, "total_count": 2}


def test_on_asset_liked_sets_default_visibility():
    store = FakeStore(settings=LikedSettings(default_public=False))
    service.on_asset_liked(store, user_id="u", asset_key="dataset:new")
    assert store.get_item("u", "dataset:new").is_public is False
    # peristiwa non-aset diabaikan
    service.on_asset_liked(store, user_id="u", asset_key="post:1")
    assert store.get_item("u", "post:1") is None
