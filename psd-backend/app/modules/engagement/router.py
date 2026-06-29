from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.modules.engagement import service
from app.modules.users.models import User
from app.modules.users.router import _check_profile_access

router = APIRouter(tags=["engagement"])


@router.get("/assets/{kind}/{slug:path}/stats")
async def asset_stats(
    kind: str,
    slug: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    return await service.get_stats(db, kind, slug, viewer)


@router.post("/assets/{kind}/{slug:path}/love")
async def love_asset(
    kind: str,
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await service.toggle_love(db, kind=kind, slug=slug, actor=user)


@router.post("/assets/{kind}/{slug:path}/share")
async def share_asset(
    kind: str,
    slug: str,
    body: dict,
    db: AsyncSession = Depends(get_db),
):
    channel = body.get("channel", "link")
    return await service.record_share(db, kind=kind, slug=slug, channel=channel)


@router.post("/assets/{kind}/{slug:path}/download")
async def download_asset(
    kind: str,
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    return await service.record_download(db, kind=kind, slug=slug)


@router.post("/assets/{kind}/{slug:path}/view")
async def view_asset(
    kind: str,
    slug: str,
    db: AsyncSession = Depends(get_db),
):
    return await service.record_view(db, kind=kind, slug=slug)


@router.get("/users/{username}/stats")
async def user_stats(
    username: str,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
):
    from sqlalchemy import select

    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u:
        from app.core.errors import ApiError

        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    _check_profile_access(u, viewer)
    return await service.user_engagement_stats(db, u)
