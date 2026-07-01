"""Soft delete & retensi trash pipeline Pabrik Data."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.factory.models import Dashboard, Pipeline, PipelineRun
from app.modules.users.models import User

log = logging.getLogger(__name__)

TRASH_RETENTION_DAYS = 30


def purge_deadline(deleted_at: datetime) -> datetime:
    if deleted_at.tzinfo is None:
        deleted_at = deleted_at.replace(tzinfo=timezone.utc)
    return deleted_at + timedelta(days=TRASH_RETENTION_DAYS)


def is_active(pl: Pipeline) -> bool:
    return pl.deleted_at is None


def trash_summary_fields(pl: Pipeline) -> dict:
    if not pl.deleted_at:
        return {}
    deleted_at = pl.deleted_at
    if deleted_at.tzinfo is None:
        deleted_at = deleted_at.replace(tzinfo=timezone.utc)
    purge_at = purge_deadline(deleted_at)
    days_left = max(0, (purge_at - datetime.now(timezone.utc)).days)
    return {
        "deleted_at": deleted_at.isoformat(),
        "purge_at": purge_at.isoformat(),
        "days_until_purge": days_left,
    }


async def assert_can_manage_pipeline(db: AsyncSession, pl: Pipeline, user: User) -> None:
    if pl.owner_id == user.id:
        return
    if pl.team_id:
        from app.modules.teams.deps import membership

        if await membership(db, pl.team_id, user.id):
            return
    raise ApiError(403, "forbidden", "Tidak berhak menyunting pipeline")


async def soft_delete_pipeline(db: AsyncSession, pl: Pipeline, user: User) -> dict:
    if not is_active(pl):
        raise ApiError(409, "already_trashed", "Pipeline sudah ada di trash.")
    await assert_can_manage_pipeline(db, pl, user)
    pl.deleted_at = datetime.now(timezone.utc)
    pl.deleted_by_id = user.id
    await db.commit()
    return {"trashed": True, **trash_summary_fields(pl)}


async def restore_pipeline(db: AsyncSession, pl: Pipeline, user: User) -> dict:
    if is_active(pl):
        raise ApiError(409, "not_trashed", "Pipeline tidak berada di trash.")
    await assert_can_manage_pipeline(db, pl, user)
    pl.deleted_at = None
    pl.deleted_by_id = None
    await db.commit()
    return {"restored": True, "id": pl.id, "slug": pl.slug}


async def permanent_delete_pipeline(db: AsyncSession, pl: Pipeline) -> None:
    await db.execute(delete(PipelineRun).where(PipelineRun.pipeline_id == pl.id))
    dashboards = (
        await db.execute(select(Dashboard).where(Dashboard.pipeline_id == pl.id))
    ).scalars().all()
    for dsh in dashboards:
        dsh.pipeline_id = None
    await db.delete(pl)
    await db.commit()


async def purge_expired_pipeline_trash(db: AsyncSession) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=TRASH_RETENTION_DAYS)
    rows = (
        await db.execute(
            select(Pipeline).where(Pipeline.deleted_at.is_not(None), Pipeline.deleted_at < cutoff)
        )
    ).scalars().all()
    count = 0
    for pl in rows:
        try:
            await permanent_delete_pipeline(db, pl)
            count += 1
        except Exception:
            log.exception("purge pipeline trash gagal pl=%s", pl.id)
            await db.rollback()
    return count
