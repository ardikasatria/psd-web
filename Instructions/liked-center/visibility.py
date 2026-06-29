"""
Visibilitas koleksi "Aset Disukai".

Sumber = suka ASET (AssetLove, Langkah 29) — BUKAN suka postingan feed/forum (terpisah).
Dua lapis kontrol:
  - list_public  : master — tampilkan daftar suka ke publik atau tidak.
  - is_public    : per-item — tandai aset mana yang tampil di daftar publik.
Pemilik selalu melihat seluruh daftarnya sendiri.
"""
from __future__ import annotations

from dataclasses import dataclass

# Kind yang BUKAN aset (jangan pernah masuk koleksi ini).
NON_ASSET_KINDS = {"post", "thread", "comment", "feed", "forum"}


@dataclass
class LikedSettings:
    list_public: bool = True        # master visibilitas daftar
    default_public: bool = True     # default per-item saat menyukai aset baru


@dataclass
class LikedItem:
    asset_key: str                  # "<kind>:<slug>"
    is_public: bool = True
    liked_at: str | None = None


def asset_kind(asset_key: str) -> str:
    return asset_key.split(":", 1)[0] if ":" in asset_key else ""


def is_asset_key(asset_key: str) -> bool:
    """True hanya untuk aset (mis. dataset:iris), bukan post:/thread:/comment:."""
    return ":" in asset_key and asset_kind(asset_key) not in NON_ASSET_KINDS


def new_item_is_public(settings: LikedSettings) -> bool:
    return settings.default_public


def visible_to(viewer_id: str | None, owner_id: str, settings: LikedSettings,
               item: LikedItem) -> bool:
    if viewer_id == owner_id:
        return True                 # pemilik melihat semua miliknya
    return settings.list_public and item.is_public


def filter_for_viewer(viewer_id: str | None, owner_id: str, settings: LikedSettings,
                      items: list[LikedItem]) -> list[LikedItem]:
    return [it for it in items if visible_to(viewer_id, owner_id, settings, it)]


def public_count(settings: LikedSettings, items: list[LikedItem]) -> int:
    if not settings.list_public:
        return 0
    return sum(1 for it in items if it.is_public)
