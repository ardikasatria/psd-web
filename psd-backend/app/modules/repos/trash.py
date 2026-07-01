"""Soft delete & retensi trash aset (proyek/dataset/model)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.core.search import delete_repo_doc, index_repo
from app.core.storage import delete_asset
from app.gitea.service import client_or_none, repo_gitea_coords
from app.modules.repos.models import Repo, RepoLike
from app.modules.users.models import User
from app.modules.users.refs import is_staff

log = logging.getLogger(__name__)

TRASH_RETENTION_DAYS = 30


def purge_deadline(deleted_at: datetime) -> datetime:
    if deleted_at.tzinfo is None:
        deleted_at = deleted_at.replace(tzinfo=timezone.utc)
    return deleted_at + timedelta(days=TRASH_RETENTION_DAYS)


def is_active(repo: Repo) -> bool:
    return repo.deleted_at is None


def trash_summary_fields(repo: Repo) -> dict:
    if not repo.deleted_at:
        return {}
    deleted_at = repo.deleted_at
    if deleted_at.tzinfo is None:
        deleted_at = deleted_at.replace(tzinfo=timezone.utc)
    purge_at = purge_deadline(deleted_at)
    days_left = max(0, (purge_at - datetime.now(timezone.utc)).days)
    return {
        "deleted_at": deleted_at.isoformat(),
        "purge_at": purge_at.isoformat(),
        "days_until_purge": days_left,
    }


async def assert_can_manage_repo(repo: Repo, user: User, db: AsyncSession) -> None:
    if repo.owner_id == user.id or is_staff(user):
        return
    if repo.team_id:
        from app.modules.teams.deps import membership

        if await membership(db, repo.team_id, user.id):
            return
    raise ApiError(403, "forbidden", "Tidak boleh mengelola aset ini")


async def soft_delete_repo(db: AsyncSession, repo: Repo, user: User) -> dict:
    if not is_active(repo):
        raise ApiError(409, "already_trashed", "Aset sudah ada di trash.")
    await assert_can_manage_repo(repo, user, db)
    repo.deleted_at = datetime.now(timezone.utc)
    repo.deleted_by_id = user.id
    repo.visibility = "private"
    await db.commit()
    try:
        delete_repo_doc(repo.id)
    except Exception:
        log.warning("meilisearch delete gagal repo=%s", repo.id, exc_info=True)
    return {"trashed": True, **trash_summary_fields(repo)}


async def restore_repo(db: AsyncSession, repo: Repo, user: User) -> dict:
    if is_active(repo):
        raise ApiError(409, "not_trashed", "Aset tidak berada di trash.")
    await assert_can_manage_repo(repo, user, db)
    repo.deleted_at = None
    repo.deleted_by_id = None
    await db.commit()
    await db.refresh(repo, ["owner"])
    try:
        index_repo(repo)
    except Exception:
        log.warning("meilisearch reindex gagal repo=%s", repo.id, exc_info=True)
    return {"restored": True, "id": repo.id, "slug": repo.slug}


async def permanent_delete_repo(db: AsyncSession, repo: Repo) -> None:
    for raw in repo.files or []:
        if not isinstance(raw, dict):
            continue
        key = raw.get("path_key") or f"repos/{repo.id}/{raw.get('path', '')}"
        if not key.endswith("/"):
            try:
                delete_asset(key)
            except Exception:
                log.warning("hapus file storage gagal key=%s", key, exc_info=True)
    try:
        delete_repo_doc(repo.id)
    except Exception:
        pass
    if repo.gitea_repo_id:
        client = client_or_none()
        if client:
            owner, name = repo_gitea_coords(repo)
            try:
                async with client:
                    await client.delete_repo(owner, name)
            except Exception:
                log.warning("hapus gitea repo gagal %s/%s", owner, name, exc_info=True)
    await db.execute(delete(RepoLike).where(RepoLike.repo_id == repo.id))
    await db.delete(repo)
    await db.commit()


async def purge_expired_trash(db: AsyncSession) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=TRASH_RETENTION_DAYS)
    rows = (
        await db.execute(select(Repo).where(Repo.deleted_at.is_not(None), Repo.deleted_at < cutoff))
    ).scalars().all()
    count = 0
    for repo in rows:
        try:
            await permanent_delete_repo(db, repo)
            count += 1
        except Exception:
            log.exception("purge trash gagal repo=%s", repo.id)
            await db.rollback()
    return count
