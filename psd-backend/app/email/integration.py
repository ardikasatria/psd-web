"""Enqueue email dari jalur request async (Langkah 59)."""
from __future__ import annotations

import logging
import uuid

from app.core.config import settings

log = logging.getLogger("psd.email")


def _new_notification_id() -> str:
    return f"ntf_{uuid.uuid4().hex[:12]}"


def schedule_event_email(
    *,
    user_id: str,
    event_type: str,
    title: str,
    body: str = "",
    link: str | None = None,
    notification_id: str | None = None,
) -> None:
    if not settings.PSD_EMAIL_ENABLED and not settings.DEV_EMAIL_ECHO:
        return
    nid = notification_id or _new_notification_id()
    payload = {
        "notification_id": nid,
        "user_id": user_id,
        "event_type": event_type,
        "title": title,
        "body": body,
        "link": link,
    }
    if settings.PSD_USE_CELERY:
        from app.email.worker import send_event_email

        send_event_email.apply_async(args=[payload], queue="email")
        return

    # Dev tanpa Celery — jalankan sinkron
    from app.email.dispatch import dispatch_event_email

    try:
        dispatch_event_email(**payload)
    except Exception:
        log.exception("email dispatch gagal nid=%s", nid)
