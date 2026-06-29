"""Provider email SMTP (Resend) & HTTP API (Langkah 59)."""
from __future__ import annotations

import logging
import smtplib
import ssl
from abc import ABC, abstractmethod
from email.message import EmailMessage
from email.utils import formataddr, parseaddr

import httpx

from app.core.config import settings

log = logging.getLogger("psd.email")


class EmailProvider(ABC):
    @abstractmethod
    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None: ...


class EchoProvider(EmailProvider):
    """Dev fallback — log ke stdout."""

    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        log.warning("EMAIL → %s | %s\n%s", to, subject, text or html)


def _clean_env(value: str | None) -> str:
    if not value:
        return ""
    return value.strip().strip('"').strip("'")


def _sender_email(raw: str) -> str:
    _, addr = parseaddr(raw)
    return (addr or raw).strip()


def format_sender(raw_sender: str, *, display_name: str | None = None) -> str:
    """Header From untuk Resend / MIME (mis. 'Projek Sains Data <no-reply@domain.com>')."""
    name, addr = parseaddr(raw_sender)
    email = (addr or raw_sender).strip()
    if not email:
        raise ValueError("PSD_EMAIL_SENDER tidak valid")
    label = (name or display_name or settings.APP_NAME.replace(" API", "")).strip()
    return formataddr((label, email)) if label else email


def email_credentials_ready() -> bool:
    key = _clean_env(settings.RESEND_API_KEY)
    sender = _sender_email(_clean_env(settings.PSD_EMAIL_SENDER))
    return bool(key and sender and "@" in sender)


def email_config_status() -> dict:
    sender_raw = _clean_env(settings.PSD_EMAIL_SENDER)
    return {
        "credentials_ready": email_credentials_ready(),
        "provider": (settings.PSD_EMAIL_PROVIDER or "http").lower(),
        "sender": sender_raw,
        "sender_formatted": format_sender(sender_raw) if email_credentials_ready() else None,
        "email_enabled": settings.PSD_EMAIL_ENABLED,
        "dev_echo": settings.DEV_EMAIL_ECHO,
        "smtp_host": settings.PSD_EMAIL_SMTP_HOST,
        "smtp_port": settings.PSD_EMAIL_SMTP_PORT,
        "smtp_tls": settings.PSD_EMAIL_SMTP_TLS,
        "smtp_ssl": settings.PSD_EMAIL_SMTP_SSL,
        "has_api_key": bool(_clean_env(settings.RESEND_API_KEY)),
    }


def _smtp_use_ssl() -> bool:
    if settings.PSD_EMAIL_SMTP_SSL:
        return True
    return settings.PSD_EMAIL_SMTP_PORT in (465, 2465)


def _build_message(
    *,
    to: str,
    subject: str,
    html: str,
    text: str | None,
    header_from: str,
) -> EmailMessage:
    msg = EmailMessage()
    msg["From"] = header_from
    msg["To"] = to
    msg["Subject"] = subject
    if text:
        msg.set_content(text, charset="utf-8")
    else:
        msg.set_content("Lihat versi HTML email ini di klien yang mendukung HTML.", charset="utf-8")
    msg.add_alternative(html, subtype="html", charset="utf-8")
    return msg


class SMTPProvider(EmailProvider):
    def __init__(
        self,
        *,
        host: str,
        port: int,
        user: str,
        password: str,
        sender: str,
        use_tls: bool = True,
        use_ssl: bool = False,
    ):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.sender = sender
        self.header_from = format_sender(sender)
        self.envelope_from = _sender_email(sender)
        self.use_tls = use_tls
        self.use_ssl = use_ssl

    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        msg = _build_message(
            to=to,
            subject=subject,
            html=html,
            text=text,
            header_from=self.header_from,
        )
        context = ssl.create_default_context()

        if self.use_ssl:
            with smtplib.SMTP_SSL(self.host, self.port, timeout=30, context=context) as smtp:
                smtp.ehlo()
                if self.user:
                    smtp.login(self.user, self.password)
                smtp.send_message(msg, from_addr=self.envelope_from, to_addrs=[to])
            return

        with smtplib.SMTP(self.host, self.port, timeout=30) as smtp:
            smtp.ehlo()
            if self.use_tls:
                smtp.starttls(context=context)
                smtp.ehlo()
            if self.user:
                smtp.login(self.user, self.password)
            smtp.send_message(msg, from_addr=self.envelope_from, to_addrs=[to])


class ResendHttpProvider(EmailProvider):
    def __init__(self, *, api_key: str, sender: str):
        self.api_key = api_key
        self.sender = format_sender(sender)

    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        payload: dict = {
            "from": self.sender,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        if text:
            payload["text"] = text
        try:
            with httpx.Client(timeout=30.0) as client:
                resp = client.post(
                    "https://api.resend.com/emails",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
        except httpx.HTTPError as exc:
            raise RuntimeError(f"Resend HTTP koneksi gagal: {exc}") from exc
        if resp.status_code >= 400:
            raise RuntimeError(f"Resend HTTP {resp.status_code}: {resp.text}")


def _build_live_provider() -> EmailProvider:
    key = _clean_env(settings.RESEND_API_KEY)
    sender = _clean_env(settings.PSD_EMAIL_SENDER)
    provider = (settings.PSD_EMAIL_PROVIDER or "http").lower().strip()

    if provider == "http":
        return ResendHttpProvider(api_key=key, sender=sender)

    return SMTPProvider(
        host=settings.PSD_EMAIL_SMTP_HOST,
        port=settings.PSD_EMAIL_SMTP_PORT,
        user=settings.PSD_EMAIL_SMTP_USER,
        password=key,
        sender=sender,
        use_tls=settings.PSD_EMAIL_SMTP_TLS,
        use_ssl=_smtp_use_ssl(),
    )


def get_provider(*, auth: bool = False) -> EmailProvider:
    """
    auth=True  → email transaksional (verifikasi/reset); aktif bila kredensial Resend ada.
    auth=False → notifikasi aktivitas; butuh PSD_EMAIL_ENABLED=true + kredensial.
    """
    if settings.DEV_EMAIL_ECHO and not email_credentials_ready():
        return EchoProvider()

    if auth:
        if not email_credentials_ready():
            log.error(
                "Auth email tidak terkirim: RESEND_API_KEY atau PSD_EMAIL_SENDER belum valid (cek deploy/.env)"
            )
            return EchoProvider()
        return _build_live_provider()

    if not settings.PSD_EMAIL_ENABLED:
        return EchoProvider()
    if not email_credentials_ready():
        log.error("Email notifikasi tidak terkirim: RESEND_API_KEY / PSD_EMAIL_SENDER belum valid")
        return EchoProvider()
    return _build_live_provider()


def get_auth_provider() -> EmailProvider:
    return get_provider(auth=True)
