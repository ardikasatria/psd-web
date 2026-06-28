"""Tiga seam integrasi OAuth ke auth & DB PSD (Langkah 14)."""
from __future__ import annotations

from dataclasses import dataclass

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.security import decode_token
from app.modules.users.models import User


@dataclass
class OAuthUser:
    sub: str
    name: str | None = None
    preferred_username: str | None = None
    email: str | None = None
    email_verified: bool = False
    picture: str | None = None
    psd_tier: str | None = None


def _user_to_oauth(user: User) -> OAuthUser:
    from app.hub.tiers import hub_tier_for_reputation

    return OAuthUser(
        sub=str(user.id),
        name=user.name,
        preferred_username=user.username,
        email=user.email,
        email_verified=user.email_verified,
        picture=user.avatar_url,
        psd_tier=hub_tier_for_reputation(user.reputation or 0),
    )


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
) -> OAuthUser | None:
    token = _extract_token(request)
    if not token:
        return None
    sub = decode_token(token)
    if not sub:
        return None
    user = (await db.execute(select(User).where(User.id == sub))).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return _user_to_oauth(user)


async def load_user_claims(db: AsyncSession, user_id: str) -> OAuthUser | None:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return _user_to_oauth(user)
