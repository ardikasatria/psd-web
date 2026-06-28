from fastapi import APIRouter, Depends
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
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
    base = settings.PSD_OAUTH_HUB_BASE_URL.rstrip("/")
    return {
        "hub_url": base,
        "enabled": bool(settings.PSD_HUB_ENABLED),
        "spawn_path": "/hub/spawn",
    }


@router.get("/hub/launch")
async def hub_launch(user: User = Depends(get_current_user)):
    """Alihkan ke JupyterHub setelah sesi PSD terkonfirmasi (OAuth otomatis di hub)."""
    if not settings.PSD_HUB_ENABLED:
        raise ApiError(503, "hub_disabled", "Jupyter Notebook belum aktif di lingkungan ini.")
    target = f"{settings.PSD_OAUTH_HUB_BASE_URL.rstrip('/')}/hub/spawn"
    return RedirectResponse(target, status_code=302)
