"""Resolve dataset `psd://` → presigned MinIO URL (Langkah 52)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.errors import ApiError
from app.core.storage import presigned_asset_get
from app.hub.auth import get_bearer_user
from app.modules.repos.models import Repo
from app.modules.users.models import User


async def resolve_dataset_file(
    db: AsyncSession,
    owner_username: str,
    dataset_name: str,
    path: str,
    *,
    viewer: User,
) -> dict:
    owner = (
        await db.execute(select(User).where(User.username == owner_username))
    ).scalar_one_or_none()
    if owner is None:
        raise ApiError(404, "not_found", "Dataset tidak ditemukan")

    slug = f"{owner_username}/{dataset_name}"
    repo = (
        await db.execute(
            select(Repo)
            .options(selectinload(Repo.owner))
            .where(Repo.slug == slug, Repo.kind == "dataset")
        )
    ).scalar_one_or_none()
    if repo is None:
        raise ApiError(404, "not_found", "Dataset tidak ditemukan")

    if repo.visibility == "private" and repo.owner_id != viewer.id and viewer.role not in (
        "superadmin",
        "humas",
    ):
        raise ApiError(403, "forbidden", "Dataset privat")

    entry = next((f for f in (repo.files or []) if f.get("path") == path), None)
    if entry is None:
        raise ApiError(404, "not_found", f"Berkas '{path}' tidak ada di dataset")

    key = entry.get("path_key") or f"repos/{repo.id}/{path}"
    content_type = entry.get("type") or "application/octet-stream"
    return {
        "presigned_url": presigned_asset_get(key, expires=900),
        "content_type": content_type,
        "path": path,
        "owner": owner_username,
        "dataset": dataset_name,
    }
