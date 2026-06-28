"""Dispatch email: gating → dedup → render → kirim (Langkah 59)."""
from __future__ import annotations

import logging

from app.core.config import settings
from app.email import seams
from app.email.preferences import should_digest, should_send_now
from app.email.templates import render_digest_email, render_event_email
from app.email.unsubscribe import unsubscribe_url

log = logging.getLogger("psd.email")


def dispatch_event_email(
    *,
    notification_id: str,
    user_id: str,
    event_type: str,
    title: str,
    body: str = "",
    link: str | None = None,
) -> str:
    """Kirim atau antre email peristiwa. Return status: sent|digest|skipped|dedup."""
    prefs = seams.user_email_prefs_sync(user_id)
    if not should_send_now(prefs, event_type):
        if should_digest(prefs, event_type):
            seams.get_digest_store().append(
                user_id,
                {
                    "notification_id": notification_id,
                    "event_type": event_type,
                    "title": title,
                    "body": body,
                    "link": link,
                },
            )
            return "digest"
        return "skipped"

    to = seams.user_email(user_id)
    if not to:
        return "skipped"

    if not seams.get_dedup().try_claim(notification_id):
        return "dedup"

    unsub = unsubscribe_url(user_id)
    subject, text, html = render_event_email(
        event_type,
        title=title,
        body=body,
        link=link,
        app_base_url=settings.APP_BASE_URL.rstrip("/"),
        unsubscribe_url=unsub,
    )
    seams.get_provider().send(to, subject, html, text)
    log.info("email sent user=%s event=%s nid=%s", user_id, event_type, notification_id)
    return "sent"


def build_digest_for_user(user_id: str) -> str:
    """Kirim ringkasan harian bila ada item tertunda."""
    prefs = seams.user_email_prefs_sync(user_id)
    if not prefs.get("email_enabled", True):
        seams.pending_digest_items(user_id)
        return "skipped"

    to = seams.user_email(user_id)
    if not to:
        seams.pending_digest_items(user_id)
        return "skipped"

    items = seams.pending_digest_items(user_id)
    if not items:
        return "empty"

    dedup_id = f"digest:{user_id}:{len(items)}:{items[-1].get('notification_id', '')}"
    if not seams.get_dedup().try_claim(dedup_id):
        return "dedup"

    unsub = unsubscribe_url(user_id)
    subject, text, html = render_digest_email(
        items,
        app_base_url=settings.APP_BASE_URL.rstrip("/"),
        unsubscribe_url=unsub,
    )
    seams.get_provider().send(to, subject, html, text)
    log.info("digest sent user=%s count=%d", user_id, len(items))
    return "sent"


def build_all_digests() -> dict:
    user_ids = seams.list_digest_user_ids()
    results = {}
    for uid in user_ids:
        results[uid] = build_digest_for_user(uid)
    return results
