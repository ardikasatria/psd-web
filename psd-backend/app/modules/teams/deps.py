from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.teams.models import Team, TeamMember
from app.modules.users.models import User


async def get_team(db: AsyncSession, slug: str) -> Team:
    t = (await db.execute(select(Team).where(Team.slug == slug))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Tim tidak ditemukan")
    return t


async def membership(db: AsyncSession, team_id: str, user_id: str) -> TeamMember | None:
    return (
        await db.execute(
            select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
        )
    ).scalar_one_or_none()


async def require_admin(db: AsyncSession, team: Team, user: User) -> TeamMember:
    m = await membership(db, team.id, user.id)
    if not m or m.role not in ("owner", "admin"):
        raise ApiError(403, "forbidden", "Butuh peran admin/owner tim")
    return m


async def team_ref(db: AsyncSession, team_id: str | None) -> dict | None:
    if not team_id:
        return None
    t = (await db.execute(select(Team).where(Team.id == team_id))).scalar_one_or_none()
    if not t:
        return None
    return {"slug": t.slug, "name": t.name}
