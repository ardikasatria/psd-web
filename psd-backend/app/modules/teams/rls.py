"""Penomoran rls_id tim (Langkah 53)."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.teams.models import Team


async def next_team_rls_id(db: AsyncSession) -> int:
    cur = (await db.execute(select(func.max(Team.rls_id)))).scalar_one_or_none()
    return int(cur or 0) + 1
