"""Seam integrasi Superset ↔ PSD (Langkah 53)."""
from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.factory.models import Dashboard
from app.modules.teams.deps import membership
from app.modules.teams.models import Team
from app.modules.users.models import User


def superset_identity(psd_user: User) -> dict:
    parts = (psd_user.name or psd_user.username).split(" ", 1)
    return {
        "username": psd_user.username,
        "first_name": parts[0],
        "last_name": parts[1] if len(parts) > 1 else "",
    }


async def dashboard_team_rls_id(db: AsyncSession, dashboard: Dashboard) -> int:
    if not dashboard.team_id:
        return 0
    team = (
        await db.execute(select(Team).where(Team.id == dashboard.team_id))
    ).scalar_one_or_none()
    if team is None:
        return 0
    return int(team.rls_id)


async def user_can_view_dashboard(
    db: AsyncSession, psd_user: User | None, dashboard: Dashboard
) -> bool:
    if dashboard.visibility == "public":
        return True
    if psd_user is None:
        return False
    if dashboard.owner_id == psd_user.id:
        return True
    if dashboard.team_id and await membership(db, dashboard.team_id, psd_user.id):
        return True
    return False


def embeddable_dashboard_uuid(dashboard: Dashboard) -> str:
    if not dashboard.superset_embed_uuid:
        raise ValueError("Dashboard belum di-enable untuk embed Superset.")
    return dashboard.superset_embed_uuid


def sanitize_gold_table(node_key: str) -> str:
    name = re.sub(r"[^a-zA-Z0-9_]", "_", node_key.lower())
    return name[:63] or "gold_output"
