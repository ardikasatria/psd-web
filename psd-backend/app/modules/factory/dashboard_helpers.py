"""Helper akses dashboard (Langkah 46/53)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.factory.models import Dashboard, PipelineRun
from app.modules.teams.deps import membership
from app.modules.users.models import User


async def get_dashboard_by_slug(db: AsyncSession, slug: str) -> Dashboard:
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if not d:
        raise ApiError(404, "not_found", "Dashboard tidak ditemukan")
    return d


async def can_edit_dashboard(db: AsyncSession, d: Dashboard, user: User) -> None:
    if d.owner_id == user.id:
        return
    if d.team_id and await membership(db, d.team_id, user.id):
        return
    raise ApiError(403, "forbidden", "Tidak berhak menyunting dashboard")


async def latest_done_run(db: AsyncSession, pipeline_id: str | None):
    if not pipeline_id:
        return None
    return (
        await db.execute(
            select(PipelineRun)
            .where(PipelineRun.pipeline_id == pipeline_id, PipelineRun.status == "done")
            .order_by(PipelineRun.created_at.desc())
            .limit(1)
        )
    ).scalars().first()


async def latest_gold_map(db: AsyncSession, dashboard: Dashboard) -> dict[str, str]:
    run = await latest_done_run(db, dashboard.pipeline_id)
    if not run:
        return {}
    return {g["node"]: g["uri"] for g in (run.layers_json or {}).get("gold", [])}
