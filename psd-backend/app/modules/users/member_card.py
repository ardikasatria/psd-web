import secrets

from app.core.config import settings as app_settings
from app.modules.users.models import User


def member_share_url(token: str) -> str:
    base = app_settings.APP_BASE_URL.rstrip("/")
    return f"{base}/m/{token}"


def ensure_member_share_token(user: User) -> str:
    if user.member_share_token:
        return user.member_share_token
    token = secrets.token_urlsafe(12)
    user.member_share_token = token
    return token
