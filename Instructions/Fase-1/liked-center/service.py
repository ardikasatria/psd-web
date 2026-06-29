"""
Service koleksi "Aset Disukai".

- list_for_viewer  : daftar tersaring sesuai penonton (pemilik lihat semua; lain hanya publik).
- set_item_visibility: tandai satu aset publik/privat (hanya pemilik; harus aset & ada di daftar).
- set_list_settings : atur master visibilitas + default per-item.
- on_asset_liked    : dipanggil engagement (Langkah 29) saat suka dibuat → set visibilitas awal.
"""
from __future__ import annotations

from . import visibility
from .visibility import filter_for_viewer, is_asset_key, new_item_is_public


class LikedError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def list_for_viewer(store, *, user_id: str, viewer_id: str | None) -> list:
    settings = store.get_settings(user_id)
    items = store.list_items(user_id)          # hanya AssetLove (aset), bukan post/forum
    return filter_for_viewer(viewer_id, user_id, settings, items)


def set_item_visibility(store, *, user_id: str, actor_id: str, asset_key: str,
                        is_public: bool) -> dict:
    if actor_id != user_id:
        raise LikedError(403, "forbidden", "Hanya pemilik yang bisa mengatur daftarnya.")
    if not is_asset_key(asset_key):
        raise LikedError(422, "not_asset", "Hanya aset yang bisa ditandai (bukan feed/forum).")
    if store.get_item(user_id, asset_key) is None:
        raise LikedError(404, "not_found", "Aset ini tidak ada di daftar suka Anda.")
    store.set_item_public(user_id, asset_key, is_public)
    return {"asset_key": asset_key, "is_public": is_public}


def set_list_settings(store, *, user_id: str, list_public: bool | None = None,
                      default_public: bool | None = None):
    s = store.get_settings(user_id)
    if list_public is not None:
        s.list_public = list_public
    if default_public is not None:
        s.default_public = default_public
    store.save_settings(user_id, s)
    return s


def on_asset_liked(store, *, user_id: str, asset_key: str) -> None:
    """Hook dari engagement: set visibilitas awal item mengikuti default pengguna."""
    if not is_asset_key(asset_key):
        return
    s = store.get_settings(user_id)
    store.set_item_public(user_id, asset_key, new_item_is_public(s))


def public_summary(store, *, user_id: str) -> dict:
    settings = store.get_settings(user_id)
    items = store.list_items(user_id)
    return {"list_public": settings.list_public,
            "public_count": visibility.public_count(settings, items),
            "total_count": len(items)}
