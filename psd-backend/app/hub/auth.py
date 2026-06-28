"""Bearer auth: JWT PSD atau OAuth access token (Langkah 52 SDK)."""
from __future__ import annotations

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import _extract_token
from app.core.errors import ApiError
from app.core.security import decode_token
from app.modules.users.models import User
from app.oauth.models import OAuthToken


async def get_bearer_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = _extract_token(request)
    if not token:
        raise ApiError(401, "unauthorized", "Token diperlukan")

    sub = decode_token(token)
    if sub:
        user = (await db.execute(select(User).where(User.id == sub))).scalar_one_or_none()
        if user and user.is_active:
            return user

    row = (
        await db.execute(select(OAuthToken).where(OAuthToken.access_token == token))
    ).scalar_one_or_none()
    if row is None or row.revoked or row.access_expired():
        raise ApiError(401, "unauthorized", "Token tidak valid")

    user = (await db.execute(select(User).where(User.id == row.user_id))).scalar_one_or_none()
    if user is None or not user.is_active:
        raise ApiError(401, "unauthorized", "Pengguna tidak ditemukan")
    return user
