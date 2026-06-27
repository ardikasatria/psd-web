from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.repos.models import Repo
from app.modules.repos.schemas import to_summary
from app.modules.gamification.service import profile_gamification
from app.modules.social.models import Follow
from app.modules.users.models import User
from app.modules.users.schemas import ProfileOut
from app.modules.users.settings import can_view_profile, is_searchable

router = APIRouter(tags=["users"])


def _check_profile_access(target: User, viewer: User | None) -> None:
    if not can_view_profile(
        getattr(target, "settings", None),
        getattr(viewer, "id", None),
        target.id,
        getattr(viewer, "role", None),
    ):
        raise ApiError(403, "private_profile", "Profil ini privat")


@router.get("/share/{token}")
async def resolve_share_token(token: str, db: AsyncSession = Depends(get_db)):
    u = (
        await db.execute(select(User).where(User.member_share_token == token))
    ).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Tautan profil tidak ditemukan")
    return {"username": u.username, "profile_url": f"{settings.APP_BASE_URL.rstrip('/')}/{u.username}"}


@router.get("/users/{username}")
async def get_user(
    username: str,
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
):
    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    _check_profile_access(u, viewer)
    projects = (
        await db.execute(
            select(func.count()).select_from(Repo).where(Repo.owner_id == u.id, Repo.kind == "project")
        )
    ).scalar_one()
    datasets = (
        await db.execute(
            select(func.count()).select_from(Repo).where(Repo.owner_id == u.id, Repo.kind == "dataset")
        )
    ).scalar_one()
    models = (
        await db.execute(
            select(func.count()).select_from(Repo).where(Repo.owner_id == u.id, Repo.kind == "model")
        )
    ).scalar_one()
    followers_count = (
        await db.execute(
            select(func.count()).select_from(Follow).where(Follow.following_id == u.id)
        )
    ).scalar_one()
    following_count = (
        await db.execute(
            select(func.count()).select_from(Follow).where(Follow.follower_id == u.id)
        )
    ).scalar_one()
    is_following = False
    if viewer and viewer.id != u.id:
        is_following = (
            await db.execute(
                select(Follow).where(Follow.follower_id == viewer.id, Follow.following_id == u.id)
            )
        ).scalar_one_or_none() is not None
    profile = ProfileOut.from_user(u, viewer=viewer).model_dump()
    profile["stats"] = {
        "projects": projects,
        "datasets": datasets,
        "models": models,
        "followers": followers_count,
    }
    profile["followers_count"] = followers_count
    profile["following_count"] = following_count
    profile["is_following"] = is_following
    profile.update(await profile_gamification(db, u))
    return profile


@router.get("/users/{username}/portfolio")
async def portfolio(
    username: str,
    kind: str | None = None,
    p: PageParams = Depends(page_params),
    db: AsyncSession = Depends(get_db),
    viewer: User | None = Depends(get_current_user_optional),
):
    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    _check_profile_access(u, viewer)
    stmt = select(Repo).where(Repo.owner_id == u.id)
    if kind:
        stmt = stmt.where(Repo.kind == kind)
    stmt = stmt.order_by(Repo.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([to_summary(r) for r in rows], total, p)
