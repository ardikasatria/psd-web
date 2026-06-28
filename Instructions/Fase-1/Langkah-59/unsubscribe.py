"""Token unsubscribe bertanda tangan (HMAC). Tautan aman tanpa login."""
from __future__ import annotations

import base64
import hashlib
import hmac


def make_token(user_id: str, secret: str, *, scope: str = "all") -> str:
    payload = f"{user_id}:{scope}"
    sig = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}:{sig}".encode()).decode()


def verify_token(token: str, secret: str) -> dict:
    raw = base64.urlsafe_b64decode(token.encode()).decode()
    user_id, scope, sig = raw.rsplit(":", 2)
    expected = hmac.new(secret.encode(), f"{user_id}:{scope}".encode(),
                        hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, sig):
        raise ValueError("token unsubscribe tidak valid.")
    return {"user_id": user_id, "scope": scope}


def footer_html(base_url: str, token: str) -> str:
    url = f"{base_url.rstrip('/')}/email/unsubscribe?token={token}"
    return (f"<p style='color:#aaa;font-size:11px'>Tak ingin email seperti ini? "
            f"<a href='{url}'>Berhenti berlangganan</a>.</p>")
