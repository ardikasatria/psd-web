from fastapi import Response

from app.core.config import settings


def set_auth_cookie(resp: Response, token: str) -> None:
    resp.set_cookie(
        settings.COOKIE_NAME,
        token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        domain=settings.COOKIE_DOMAIN,
        max_age=settings.JWT_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(resp: Response) -> None:
    resp.delete_cookie(settings.COOKIE_NAME, domain=settings.COOKIE_DOMAIN, path="/")
