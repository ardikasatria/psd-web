from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.discovery import service
from app.modules.users.models import User

router = APIRouter(tags=["discovery"])

KINDS = {"top-tier", "popular", "new", "achievements", "similar"}


@router.get("/discovery/panels")
async def discovery_panels(
    limit: int = 8,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    lim = max(1, min(limit, 20))
    return await service.get_panels(db, viewer, limit=lim)


@router.get("/discovery/{kind}")
async def discovery_list(
    kind: str,
    p: PageParams = Depends(page_params),
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    if kind not in KINDS:
        raise ApiError(404, "not_found", "Kategori penemuan tidak ditemukan")
    if kind == "similar" and not viewer:
        raise ApiError(401, "unauthorized", "Masuk untuk melihat orang serupa")
    items, total = await service.get_list(db, kind, viewer, offset=p.offset, page_size=p.page_size)
    return paginated(items, total, p)
