"""DB adapter untuk koleksi aset disukai."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.engagement.models import AssetLove
from app.modules.liked.visibility import LikedItem, LikedSettings, is_asset_key
from app.modules.users.models import User


class DbLikedStore:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_items(self, user_id: str) -> list[LikedItem]:
        rows = (
            await self.db.execute(
                select(AssetLove)
                .where(AssetLove.user_id == user_id)
                .order_by(AssetLove.created_at.desc())
            )
        ).scalars().all()
        return [
            LikedItem(
                asset_key=r.asset_key,
                is_public=bool(r.is_public),
                liked_at=r.created_at.isoformat() if r.created_at else None,
            )
            for r in rows
            if is_asset_key(r.asset_key)
        ]

    async def get_item(self, user_id: str, asset_key: str) -> LikedItem | None:
        row = (
            await self.db.execute(
                select(AssetLove).where(AssetLove.user_id == user_id, AssetLove.asset_key == asset_key)
            )
        ).scalar_one_or_none()
        if not row or not is_asset_key(asset_key):
            return None
        return LikedItem(
            asset_key=row.asset_key,
            is_public=bool(row.is_public),
            liked_at=row.created_at.isoformat() if row.created_at else None,
        )

    async def set_item_public(self, user_id: str, asset_key: str, is_public: bool) -> None:
        row = (
            await self.db.execute(
                select(AssetLove).where(AssetLove.user_id == user_id, AssetLove.asset_key == asset_key)
            )
        ).scalar_one_or_none()
        if row:
            row.is_public = is_public

    async def get_settings(self, user_id: str) -> LikedSettings:
        user = (await self.db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            return LikedSettings()
        return LikedSettings(
            list_public=bool(getattr(user, "liked_list_public", True)),
            default_public=bool(getattr(user, "liked_default_public", True)),
        )

    async def save_settings(self, user_id: str, settings: LikedSettings) -> None:
        user = (await self.db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            return
        user.liked_list_public = settings.list_public
        user.liked_default_public = settings.default_public


class SyncLikedStore:
    """Adapter sinkron untuk service.py (dipakai dengan data yang sudah dimuat)."""

    def __init__(self, items: list[LikedItem], settings: LikedSettings):
        self._items = {i.asset_key: i for i in items}
        self._settings = settings
        self._mutations: list[tuple[str, str, bool]] = []

    def list_items(self, user_id: str) -> list[LikedItem]:
        return list(self._items.values())

    def get_item(self, user_id: str, asset_key: str):
        return self._items.get(asset_key)

    def set_item_public(self, user_id: str, asset_key: str, is_public: bool) -> None:
        if asset_key in self._items:
            self._items[asset_key].is_public = is_public
        else:
            self._items[asset_key] = LikedItem(asset_key, is_public)
        self._mutations.append((user_id, asset_key, is_public))

    def get_settings(self, user_id: str) -> LikedSettings:
        return self._settings

    def save_settings(self, user_id: str, settings: LikedSettings) -> None:
        self._settings = settings
