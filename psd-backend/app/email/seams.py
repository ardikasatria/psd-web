"""Seam integrasi email ↔ domain PSD (Langkah 59)."""
from __future__ import annotations

from sqlalchemy import select

from app.email.preferences import user_email_prefs
from app.email.provider import get_provider
from app.email.store import get_dedup, get_digest_store
from app.modules.users.models import User
from app.tasks.seams import _worker_session


def user_email(user_id: str) -> str | None:
    with _worker_session() as db:
        row = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not row or not row.email_verified:
            return None
        return row.email


def user_email_prefs_sync(user_id: str) -> dict:
    with _worker_session() as db:
        row = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
        if not row:
            return {"email_enabled": False, "default_mode": "off", "events": {}}
        return user_email_prefs(row.settings)


def pending_digest_items(user_id: str) -> list[dict]:
    return get_digest_store().drain(user_id)


def list_digest_user_ids() -> list[str]:
    return get_digest_store().list_user_ids()


__all__ = [
    "get_provider",
    "get_dedup",
    "get_digest_store",
    "user_email",
    "user_email_prefs_sync",
    "pending_digest_items",
    "list_digest_user_ids",
]
