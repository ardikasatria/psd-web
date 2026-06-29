"""Visibilitas koleksi Aset Disukai."""
from __future__ import annotations

from dataclasses import dataclass

NON_ASSET_KINDS = {"post", "thread", "comment", "feed", "forum"}


@dataclass
class LikedSettings:
    list_public: bool = True
    default_public: bool = True


@dataclass
class LikedItem:
    asset_key: str
    is_public: bool = True
    liked_at: str | None = None


def asset_kind(asset_key: str) -> str:
    return asset_key.split(":", 1)[0] if ":" in asset_key else ""


def asset_slug(asset_key: str) -> str:
    return asset_key.split(":", 1)[1] if ":" in asset_key else ""


def is_asset_key(asset_key: str) -> bool:
    return ":" in asset_key and asset_kind(asset_key) not in NON_ASSET_KINDS


def new_item_is_public(settings: LikedSettings) -> bool:
    return settings.default_public


def visible_to(viewer_id: str | None, owner_id: str, settings: LikedSettings, item: LikedItem) -> bool:
    if viewer_id == owner_id:
        return True
    return settings.list_public and item.is_public


def filter_for_viewer(
    viewer_id: str | None, owner_id: str, settings: LikedSettings, items: list[LikedItem]
) -> list[LikedItem]:
    return [it for it in items if visible_to(viewer_id, owner_id, settings, it)]


def public_count(settings: LikedSettings, items: list[LikedItem]) -> int:
    if not settings.list_public:
        return 0
    return sum(1 for it in items if it.is_public)
