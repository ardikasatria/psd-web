"""Endpoint koleksi aset disukai."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.engagement.models import AssetLove
from app.modules.liked.resolver import enrich_liked_asset
from app.modules.liked.store import DbLikedStore
from app.modules.liked.visibility import filter_for_viewer, is_asset_key, public_count
from app.modules.users.models import User
from app.modules.users.router import _check_profile_access

router = APIRouter(tags=["liked"])


async def _user_by_username(db: AsyncSession, username: str) -> User:
    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    return u


async def _paginated_liked(
    db: AsyncSession,
    store: DbLikedStore,
    *,
    owner: User,
    viewer: User | None,
    p: PageParams,
):
    settings = await store.get_settings(owner.id)
    items = await store.list_items(owner.id)
    viewer_id = viewer.id if viewer else None

    if viewer_id != owner.id and not settings.list_public:
        return paginated([], 0, p)

    filtered = filter_for_viewer(viewer_id, owner.id, settings, items)
    total = len(filtered)
    page_items = filtered[p.offset : p.offset + p.page_size]
    out = []
    for item in page_items:
        row = await enrich_liked_asset(db, item)
        if row:
            out.append(row)
    return paginated(out, total, p)


@router.get("/me/liked-assets")
async def my_liked_assets(
    p: PageParams = Depends(page_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    store = DbLikedStore(db)
    return await _paginated_liked(db, store, owner=user, viewer=user, p=p)


@router.get("/users/{username}/liked-assets")
async def user_liked_assets(
    username: str,
    p: PageParams = Depends(page_params),
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    owner = await _user_by_username(db, username)
    _check_profile_access(owner, viewer)
    store = DbLikedStore(db)
    return await _paginated_liked(db, store, owner=owner, viewer=viewer, p=p)


@router.get("/users/{username}/liked-assets/summary")
async def user_liked_summary(
    username: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    owner = await _user_by_username(db, username)
    _check_profile_access(owner, viewer)
    store = DbLikedStore(db)
    settings = await store.get_settings(owner.id)
    items = await store.list_items(owner.id)
    viewer_id = viewer.id if viewer else None
    is_owner = viewer_id == owner.id

    if viewer_id != owner.id and not settings.list_public:
        return {"list_public": False, "public_count": 0, "total_count": 0}

    visible = filter_for_viewer(viewer_id, owner.id, settings, items)
    out = {
        "list_public": settings.list_public,
        "public_count": public_count(settings, items),
        "total_count": len(items) if is_owner else len(visible),
    }
    if is_owner:
        out["default_public"] = settings.default_public
    return out


@router.patch("/me/liked-assets/{kind}/{slug:path}/visibility")
async def patch_item_visibility(
    kind: str,
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    asset_key = f"{kind}:{slug}"
    if not is_asset_key(asset_key):
        raise ApiError(422, "not_asset", "Hanya aset yang bisa ditandai (bukan feed/forum).")
    row = (
        await db.execute(
            select(AssetLove).where(AssetLove.user_id == user.id, AssetLove.asset_key == asset_key)
        )
    ).scalar_one_or_none()
    if not row:
        raise ApiError(404, "not_found", "Aset ini tidak ada di daftar suka Anda.")
    is_public = bool(body.get("is_public", True))
    row.is_public = is_public
    await db.commit()
    return {"asset_key": asset_key, "is_public": is_public}


@router.patch("/me/settings/liked-list")
async def patch_liked_list_settings(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if "list_public" in body:
        user.liked_list_public = bool(body["list_public"])
    if "default_public" in body:
        user.liked_default_public = bool(body["default_public"])
    await db.commit()
    return {
        "list_public": bool(user.liked_list_public),
        "default_public": bool(user.liked_default_public),
    }
