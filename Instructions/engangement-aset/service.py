"""
Service engagement: orkestrasi peristiwa suka/bagikan/unduh.

- toggle_love : idempoten per (aktor, aset); cegah suka aset sendiri; beri reputasi
  ke pemilik (dari orang lain, bukan diri sendiri).
- record_share: tambah per saluran (feed/forum/external/link).
- record_download: tambah unduhan.

Penyimpanan & gamifikasi = seam. Ringkasan pemilik diperbarui inkremental (sumber tunggal).
"""
from __future__ import annotations

from . import counters
from .counters import SHARE_CHANNELS


class EngagementError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def toggle_love(store, *, asset_key: str, owner_id: str, actor_id: str,
                gamification=None) -> dict:
    if actor_id == owner_id:
        raise EngagementError(422, "cannot_love_own", "Tak bisa menyukai aset sendiri.")
    had = store.has_loved(actor_id, asset_key)
    loved = not had
    store.set_loved(actor_id, asset_key, loved)

    asset = store.get_asset(asset_key)
    summary = store.get_summary(owner_id)
    counters.apply_love(asset, summary, loved=loved)
    store.save_asset(asset_key, asset)
    store.save_summary(owner_id, summary)

    if loved and gamification is not None:
        gamification.award(owner_id, "like_received")
        if asset.love_count == 50:
            gamification.badge(owner_id, "populer")

    return {"loved": loved, "love_count": asset.love_count}


def record_share(store, *, asset_key: str, owner_id: str, channel: str,
                 actor_id: str | None = None, dedupe: bool = False) -> dict:
    if channel not in SHARE_CHANNELS:
        raise EngagementError(422, "bad_channel", f"Saluran tak dikenal: {channel}")
    # Anti-spam opsional: lewati bila aktor sudah berbagi aset ini di saluran sama hari ini.
    if dedupe and actor_id and store.shared_today(actor_id, asset_key, channel):
        asset = store.get_asset(asset_key)
        return {"share_count": asset.share_count, "shares": dict(asset.shares), "deduped": True}

    asset = store.get_asset(asset_key)
    summary = store.get_summary(owner_id)
    counters.apply_share(asset, summary, channel=channel)
    store.save_asset(asset_key, asset)
    store.save_summary(owner_id, summary)
    if dedupe and actor_id:
        store.mark_shared_today(actor_id, asset_key, channel)
    return {"share_count": asset.share_count, "shares": dict(asset.shares)}


def record_download(store, *, asset_key: str, owner_id: str) -> dict:
    asset = store.get_asset(asset_key)
    summary = store.get_summary(owner_id)
    counters.apply_download(asset, summary)
    store.save_asset(asset_key, asset)
    store.save_summary(owner_id, summary)
    return {"download_count": asset.download_count}
