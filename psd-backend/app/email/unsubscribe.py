"""Token unsubscribe bertanda tangan HMAC (Langkah 59)."""
from __future__ import annotations

import hashlib
import hmac
from urllib.parse import urlencode

from app.core.config import settings


def _secret() -> bytes:
    key = settings.PSD_EMAIL_UNSUBSCRIBE_SECRET or settings.JWT_SECRET
    return key.encode("utf-8")


def make_unsubscribe_token(user_id: str) -> str:
    sig = hmac.new(_secret(), user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{user_id}.{sig}"


def verify_unsubscribe_token(token: str) -> str | None:
    if not token or "." not in token:
        return None
    user_id, sig = token.rsplit(".", 1)
    if not user_id or not sig:
        return None
    expected = hmac.new(_secret(), user_id.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        return None
    return user_id


def unsubscribe_url(user_id: str) -> str:
    token = make_unsubscribe_token(user_id)
    api_base = settings.PSD_OIDC_ISSUER.rstrip("/")
    return f"{api_base}/email/unsubscribe?{urlencode({'token': token})}"
