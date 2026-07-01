from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.users.refs import is_staff
from app.core.errors import ApiError
from app.modules.orgs.models import Organization, OrgMember
from app.modules.users.models import User


async def get_org_by_handle(db: AsyncSession, handle: str) -> Organization:
    o = (await db.execute(select(Organization).where(Organization.handle == handle))).scalar_one_or_none()
    if not o:
        raise ApiError(404, "not_found", "Organisasi tidak ditemukan")
    return o


async def get_org_by_id(db: AsyncSession, org_id: str) -> Organization:
    o = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()
    if not o:
        raise ApiError(404, "not_found", "Organisasi tidak ditemukan")
    return o


async def membership(db: AsyncSession, org_id: str, user_id: str) -> OrgMember | None:
    return (
        await db.execute(
            select(OrgMember).where(OrgMember.org_id == org_id, OrgMember.user_id == user_id)
        )
    ).scalar_one_or_none()


async def require_member(db: AsyncSession, org: Organization, user: User) -> OrgMember:
    m = await membership(db, org.id, user.id)
    if not m:
        raise ApiError(403, "forbidden", "Bukan anggota organisasi")
    return m


async def members_dicts(db: AsyncSession, org_id: str) -> list[dict]:
    rows = (await db.execute(select(OrgMember).where(OrgMember.org_id == org_id))).scalars().all()
    return [{"user_id": m.user_id, "role": m.role} for m in rows]


def require_platform_admin(user: User) -> None:
    if not is_staff(user):
        raise ApiError(403, "forbidden", "Akses khusus admin platform")
