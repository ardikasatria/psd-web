from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.hub.auth import get_bearer_user
from app.hub.resolve import resolve_dataset_file
from app.modules.users.models import User

router = APIRouter(tags=["hub"])


@router.get("/datasets/{owner}/{dataset}/resolve")
async def resolve_dataset(
    owner: str,
    dataset: str,
    path: str,
    user: User = Depends(get_bearer_user),
    db: AsyncSession = Depends(get_db),
):
    return await resolve_dataset_file(db, owner, dataset, path, viewer=user)


@router.get("/hub/config")
async def hub_config():
    return {
        "hub_url": settings.PSD_OAUTH_HUB_BASE_URL,
        "enabled": bool(settings.PSD_HUB_ENABLED),
    }
