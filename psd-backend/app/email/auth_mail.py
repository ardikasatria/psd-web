"""Pengiriman email transaksional auth via SMTP/Resend (Langkah 60)."""
from __future__ import annotations

import logging

from app.core.config import settings
from app.email.auth_templates import render_auth_email
from app.email.provider import email_credentials_ready, get_auth_provider

log = logging.getLogger("psd.email.auth")


def send_auth_email(
    kind: str,
    to: str,
    *,
    recipient_name: str | None = None,
    action_url: str | None = None,
    expiry_minutes: int | None = None,
    extra_line: str | None = None,
) -> None:
    subject, text, html = render_auth_email(
        kind,
        recipient_name=recipient_name,
        action_url=action_url,
        expiry_minutes=expiry_minutes,
        app_name=settings.APP_NAME.replace(" API", ""),
        extra_line=extra_line,
    )

    if settings.DEV_EMAIL_ECHO and not email_credentials_ready():
        log.warning("AUTH EMAIL [%s] → %s | %s\n%s", kind, to, subject, text)
        return

    try:
        get_auth_provider().send(to, subject, html, text)
    except Exception as exc:
        log.exception("auth_email_send_failed kind=%s to=%s", kind, to, exc_info=exc)
        if settings.DEV_EMAIL_ECHO:
            log.warning("AUTH EMAIL (fallback) [%s] → %s | %s\n%s", kind, to, subject, text)


def send_verify_email(
    to: str,
    *,
    name: str | None,
    token: str,
    expiry_minutes: int = 60,
) -> None:
    url = f"{settings.APP_BASE_URL.rstrip('/')}/verify-email?token={token}"
    send_auth_email(
        "verify",
        to,
        recipient_name=name,
        action_url=url,
        expiry_minutes=expiry_minutes,
    )


def send_change_email_verification(
    to: str,
    *,
    name: str | None,
    token: str,
    expiry_minutes: int = 60,
) -> None:
    url = f"{settings.APP_BASE_URL.rstrip('/')}/verify-email?token={token}"
    send_auth_email(
        "change_email",
        to,
        recipient_name=name,
        action_url=url,
        expiry_minutes=expiry_minutes,
        extra_line="Klik tombol di bawah untuk mengonfirmasi alamat email baru.",
    )


def send_reset_password_email(
    to: str,
    *,
    name: str | None,
    token: str,
    expiry_minutes: int = 30,
) -> None:
    url = f"{settings.APP_BASE_URL.rstrip('/')}/reset-password?token={token}"
    send_auth_email(
        "reset_password",
        to,
        recipient_name=name,
        action_url=url,
        expiry_minutes=expiry_minutes,
    )


def send_password_changed_email(to: str, *, name: str | None) -> None:
    send_auth_email(
        "password_changed",
        to,
        recipient_name=name,
        action_url=f"{settings.APP_BASE_URL.rstrip('/')}/login",
    )
