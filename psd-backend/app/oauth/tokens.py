"""Pembuatan token: access/refresh (opaque) + ID token (JWT RS256)."""
import secrets
import time

from authlib.jose import jwt

from app.oauth.keys import get_kid, get_private_key


def new_opaque(nbytes: int = 32) -> str:
    return secrets.token_urlsafe(nbytes)


def make_id_token(
    *,
    issuer: str,
    client_id: str,
    user_claims: dict,
    nonce: str | None,
    auth_time: int,
    scope: str,
    expires_in: int,
) -> str:
    now = int(time.time())
    header = {"alg": "RS256", "kid": get_kid(), "typ": "JWT"}
    payload = {
        "iss": issuer.rstrip("/"),
        "sub": str(user_claims["sub"]),
        "aud": client_id,
        "iat": now,
        "exp": now + expires_in,
        "auth_time": auth_time,
    }
    if nonce:
        payload["nonce"] = nonce

    scopes = set(scope.split())
    if "profile" in scopes:
        for claim in ("name", "preferred_username", "picture", "psd_tier"):
            if user_claims.get(claim) is not None:
                payload[claim] = user_claims[claim]
    if "email" in scopes and user_claims.get("email") is not None:
        payload["email"] = user_claims["email"]
        payload["email_verified"] = bool(user_claims.get("email_verified", False))

    token = jwt.encode(header, payload, get_private_key())
    return token.decode() if isinstance(token, bytes) else token
