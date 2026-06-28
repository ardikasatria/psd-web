"""Task Celery antrian email (Langkah 59)."""
from __future__ import annotations

from app.email.dispatch import build_all_digests, dispatch_event_email
from app.tasks.base import PSDTask
from app.tasks.celery_app import celery_app


@celery_app.task(bind=True, base=PSDTask, name="psd.email.send_event")
def send_event_email(self, payload: dict) -> dict:
    status = dispatch_event_email(
        notification_id=payload["notification_id"],
        user_id=payload["user_id"],
        event_type=payload["event_type"],
        title=payload["title"],
        body=payload.get("body", ""),
        link=payload.get("link"),
    )
    return {"status": status, "notification_id": payload["notification_id"]}


@celery_app.task(bind=True, base=PSDTask, name="psd.email.daily_digest")
def send_daily_digest(self) -> dict:
    return build_all_digests()
