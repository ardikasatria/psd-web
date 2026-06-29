"""Orkestrasi suka/bagikan/unduh aset."""
from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.engagement.counters import (
    SHARE_CHANNELS,
    AssetCounters,
    UserSummary,
    apply_download,
    apply_love,
    apply_share,
    apply_view,
)
from app.modules.engagement.models import AssetEngagement, AssetLove
from app.modules.gamification.service import after_repo_liked
from app.modules.liked.store import DbLikedStore
from app.modules.learn.models import Notebook
from app.modules.repos.models import Repo
from app.modules.users.models import User

REPO_KINDS = frozenset({"project", "dataset", "model"})
ASSET_KINDS = REPO_KINDS | {"notebook"}


@dataclass(frozen=True)
class ResolvedAsset:
    owner_id: str
    key: str
    repo: Repo | None = None


def asset_key(kind: str, slug: str) -> str:
    return f"{kind}:{slug}"


def _row_to_counters(row: AssetEngagement) -> AssetCounters:
    return AssetCounters(
        love_count=row.love_count or 0,
        download_count=row.download_count or 0,
        view_count=row.view_count or 0,
        shares={
            "feed": row.share_feed or 0,
            "forum": row.share_forum or 0,
            "external": row.share_external or 0,
            "link": row.share_link or 0,
        },
    )


def _apply_counters_to_row(row: AssetEngagement, c: AssetCounters) -> None:
    row.love_count = c.love_count
    row.download_count = c.download_count
    row.view_count = c.view_count
    row.share_feed = c.shares.get("feed", 0)
    row.share_forum = c.shares.get("forum", 0)
    row.share_external = c.shares.get("external", 0)
    row.share_link = c.shares.get("link", 0)


async def resolve_asset(db: AsyncSession, kind: str, slug: str) -> ResolvedAsset:
    if kind not in ASSET_KINDS:
        raise ApiError(404, "not_found", "Jenis aset tidak dikenal")
    key = asset_key(kind, slug)
    if kind == "notebook":
        n = (await db.execute(select(Notebook).where(Notebook.id == slug))).scalar_one_or_none()
        if not n:
            raise ApiError(404, "not_found", "Notebook tidak ditemukan")
        return ResolvedAsset(owner_id=n.owner_id, key=key)
    r = (
        await db.execute(select(Repo).where(Repo.kind == kind, Repo.slug == slug))
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    return ResolvedAsset(owner_id=r.owner_id, key=key, repo=r)


async def _get_or_create_engagement(db: AsyncSession, key: str, owner_id: str) -> AssetEngagement:
    row = (await db.execute(select(AssetEngagement).where(AssetEngagement.asset_key == key))).scalar_one_or_none()
    if row:
        return row
    row = AssetEngagement(asset_key=key, owner_id=owner_id)
    db.add(row)
    await db.flush()
    return row


async def _owner_summary(db: AsyncSession, owner_id: str) -> UserSummary:
    owner = (await db.execute(select(User).where(User.id == owner_id))).scalar_one_or_none()
    if not owner:
        return UserSummary()
    return UserSummary(
        total_loves_received=owner.total_loves_received or 0,
        total_shares=owner.total_shares or 0,
        total_downloads=owner.total_downloads or 0,
        total_views=owner.total_views or 0,
        asset_count=owner.engagement_asset_count or 0,
    )


async def _save_summary(db: AsyncSession, owner_id: str, summary: UserSummary) -> None:
    owner = (await db.execute(select(User).where(User.id == owner_id))).scalar_one_or_none()
    if not owner:
        return
    owner.total_loves_received = summary.total_loves_received
    owner.total_shares = summary.total_shares
    owner.total_downloads = summary.total_downloads
    owner.total_views = summary.total_views
    owner.engagement_asset_count = summary.asset_count


async def _sync_repo_counters(db: AsyncSession, repo: Repo, c: AssetCounters) -> None:
    repo.likes = c.love_count
    repo.downloads = c.download_count


async def has_loved(db: AsyncSession, user_id: str, key: str) -> bool:
    return (
        await db.execute(
            select(AssetLove).where(AssetLove.user_id == user_id, AssetLove.asset_key == key)
        )
    ).scalar_one_or_none() is not None


def stats_payload(c: AssetCounters, *, liked: bool) -> dict:
    return {
        "love_count": c.love_count,
        "share_count": c.share_count,
        "shares": dict(c.shares),
        "download_count": c.download_count,
        "view_count": c.view_count,
        "liked": liked,
    }


async def get_stats(db: AsyncSession, kind: str, slug: str, viewer: User | None) -> dict:
    asset = await resolve_asset(db, kind, slug)
    row = (await db.execute(select(AssetEngagement).where(AssetEngagement.asset_key == asset.key))).scalar_one_or_none()
    if row:
        c = _row_to_counters(row)
    elif asset.repo:
        c = AssetCounters(love_count=asset.repo.likes or 0, download_count=asset.repo.downloads or 0)
    else:
        c = AssetCounters()
    liked = await has_loved(db, viewer.id, asset.key) if viewer else False
    return stats_payload(c, liked=liked)


async def toggle_love(db: AsyncSession, *, kind: str, slug: str, actor: User) -> dict:
    asset = await resolve_asset(db, kind, slug)
    if asset.owner_id == actor.id:
        raise ApiError(422, "cannot_love_own", "Tak bisa menyukai aset sendiri")
    key = asset.key
    had = await has_loved(db, actor.id, key)
    loved = not had

    if loved:
        settings = await DbLikedStore(db).get_settings(actor.id)
        db.add(AssetLove(user_id=actor.id, asset_key=key, is_public=settings.default_public))
    else:
        existing = (
            await db.execute(
                select(AssetLove).where(AssetLove.user_id == actor.id, AssetLove.asset_key == key)
            )
        ).scalar_one_or_none()
        if existing:
            await db.delete(existing)

    row = await _get_or_create_engagement(db, key, asset.owner_id)
    summary = await _owner_summary(db, asset.owner_id)
    c = _row_to_counters(row)
    apply_love(c, summary, loved=loved)
    _apply_counters_to_row(row, c)
    await _save_summary(db, asset.owner_id, summary)
    if asset.repo:
        await _sync_repo_counters(db, asset.repo, c)
    await db.commit()

    if loved and asset.repo:
        await db.refresh(asset.repo, ["owner"])
        if asset.repo.owner:
            await after_repo_liked(db, asset.repo, actor)

    return {"liked": loved, "love_count": c.love_count}


async def record_share(
    db: AsyncSession,
    *,
    kind: str,
    slug: str,
    channel: str,
) -> dict:
    if channel not in SHARE_CHANNELS:
        raise ApiError(422, "bad_channel", f"Saluran tak dikenal: {channel}")
    asset = await resolve_asset(db, kind, slug)
    key = asset.key
    row = await _get_or_create_engagement(db, key, asset.owner_id)
    summary = await _owner_summary(db, asset.owner_id)
    c = _row_to_counters(row)
    apply_share(c, summary, channel=channel)
    _apply_counters_to_row(row, c)
    await _save_summary(db, asset.owner_id, summary)
    await db.commit()
    return {"share_count": c.share_count, "shares": dict(c.shares)}


async def record_download(db: AsyncSession, *, kind: str, slug: str) -> dict:
    asset = await resolve_asset(db, kind, slug)
    key = asset.key
    row = await _get_or_create_engagement(db, key, asset.owner_id)
    summary = await _owner_summary(db, asset.owner_id)
    c = _row_to_counters(row)
    apply_download(c, summary)
    _apply_counters_to_row(row, c)
    await _save_summary(db, asset.owner_id, summary)
    if asset.repo:
        await _sync_repo_counters(db, asset.repo, c)
    await db.commit()
    return {"download_count": c.download_count}


async def record_view(db: AsyncSession, *, kind: str, slug: str) -> dict:
    asset = await resolve_asset(db, kind, slug)
    key = asset.key
    row = await _get_or_create_engagement(db, key, asset.owner_id)
    summary = await _owner_summary(db, asset.owner_id)
    c = _row_to_counters(row)
    apply_view(c, summary)
    _apply_counters_to_row(row, c)
    await _save_summary(db, asset.owner_id, summary)
    await db.commit()
    return {"view_count": c.view_count}


async def user_engagement_stats(db: AsyncSession, user: User) -> dict:
    asset_count = (
        await db.execute(select(Repo).where(Repo.owner_id == user.id))
    ).scalars().all()
    count = len(asset_count)
    if user.engagement_asset_count != count:
        user.engagement_asset_count = count
        await db.commit()
    return {
        "total_loves_received": user.total_loves_received or 0,
        "total_shares": user.total_shares or 0,
        "total_downloads": user.total_downloads or 0,
        "total_views": user.total_views or 0,
        "asset_count": count,
    }
