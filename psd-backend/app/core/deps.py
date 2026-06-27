from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.errors import ApiError
from app.core.security import decode_token
from app.modules.users.models import User
from app.modules.users.refs import STAFF_ROLES, is_staff


def _extract_token(request: Request) -> str | None:
    token = request.cookies.get(settings.COOKIE_NAME)
    if token:
        return token
    auth = request.headers.get("authorization")
    if auth and auth.startswith("Bearer "):
        return auth.split(" ", 1)[1]
    return None


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = _extract_token(request)
    if not token:
        raise ApiError(401, "unauthorized", "Belum masuk")
    sub = decode_token(token)
    if not sub:
        raise ApiError(401, "unauthorized", "Sesi tidak valid")
    user = (await db.execute(select(User).where(User.id == sub))).scalar_one_or_none()
    if not user or not user.is_active:
        raise ApiError(401, "unauthorized", "Sesi tidak valid")
    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    token = _extract_token(request)
    if not token:
        return None
    sub = decode_token(token)
    if not sub:
        return None
    user = (await db.execute(select(User).where(User.id == sub))).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


async def require_staff(user: User = Depends(get_current_user)) -> User:
    if user.role not in STAFF_ROLES:
        raise ApiError(403, "forbidden", "Khusus staf (humas/superadmin)")
    return user


async def require_superadmin(user: User = Depends(get_current_user)) -> User:
    if user.role != "superadmin":
        raise ApiError(403, "forbidden", "Khusus super admin")
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Deprecated alias — use require_superadmin."""
    if user.role != "superadmin":
        raise ApiError(403, "forbidden", "Khusus super admin")
    return user


async def require_instructor(user: User = Depends(get_current_user)) -> User:
    if not (user.is_instructor or is_staff(user)):
        raise ApiError(403, "forbidden", "Khusus instruktur")
    return user
