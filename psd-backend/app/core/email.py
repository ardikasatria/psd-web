"""Pengiriman email transaksional — delegasi ke modul auth (Langkah 60)."""
from __future__ import annotations

import logging

from app.email.auth_mail import send_auth_email

log = logging.getLogger("psd.email")


def send_email(to: str, subject: str, body: str, *, user_id: str | None = None) -> None:
    """Legacy wrapper — gunakan send_* dari auth_mail untuk alur auth."""
    log.warning("send_email legacy dipanggil; pertimbangkan auth_mail.send_* — %s", subject)
    send_auth_email(
        "verify",
        to,
        action_url=body if body.startswith("http") else None,
        extra_line=body if not body.startswith("http") else None,
    )
