from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ApiError
from app.modules.rooms.models import IdeaRoom
from app.modules.teams.deps import membership
from app.modules.users.models import User


async def get_room(db: AsyncSession, slug: str) -> IdeaRoom:
    r = (await db.execute(select(IdeaRoom).where(IdeaRoom.slug == slug))).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Ruang tidak ditemukan")
    return r


async def require_master(db: AsyncSession, room: IdeaRoom, user: User):
    m = await membership(db, room.team_id, user.id)
    if not m or m.role not in ("owner", "admin"):
        raise ApiError(403, "forbidden", "Hanya master room")
    return m
