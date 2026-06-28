"""Provider email SMTP (Resend) & HTTP API (Langkah 59)."""
from __future__ import annotations

import json
import logging
import smtplib
import ssl
import urllib.error
import urllib.request
from abc import ABC, abstractmethod
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

log = logging.getLogger("psd.email")


class EmailProvider(ABC):
    @abstractmethod
    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None: ...


class EchoProvider(EmailProvider):
    """Dev fallback — log ke stdout."""

    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        log.warning("EMAIL → %s | %s\n%s", to, subject, text or html)


def email_credentials_ready() -> bool:
    return bool((settings.RESEND_API_KEY or "").strip() and (settings.PSD_EMAIL_SENDER or "").strip())


def _smtp_use_ssl() -> bool:
    if settings.PSD_EMAIL_SMTP_SSL:
        return True
    return settings.PSD_EMAIL_SMTP_PORT in (465, 2465)


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
        self.use_tls = use_tls
        self.use_ssl = use_ssl

    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.sender
        msg["To"] = to
        if text:
            msg.attach(MIMEText(text, "plain", "utf-8"))
        msg.attach(MIMEText(html, "html", "utf-8"))
        raw = msg.as_string()
        context = ssl.create_default_context()

        if self.use_ssl:
            with smtplib.SMTP_SSL(self.host, self.port, timeout=30, context=context) as smtp:
                smtp.ehlo()
                if self.user:
                    smtp.login(self.user, self.password)
                smtp.sendmail(self.sender, [to], raw)
            return

        with smtplib.SMTP(self.host, self.port, timeout=30) as smtp:
            smtp.ehlo()
            if self.use_tls:
                smtp.starttls(context=context)
                smtp.ehlo()
            if self.user:
                smtp.login(self.user, self.password)
            smtp.sendmail(self.sender, [to], raw)


class ResendHttpProvider(EmailProvider):
    def __init__(self, *, api_key: str, sender: str):
        self.api_key = api_key
        self.sender = sender

    def send(self, to: str, subject: str, html: str, text: str | None = None) -> None:
        payload: dict = {
            "from": self.sender,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        if text:
            payload["text"] = text
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "https://api.resend.com/emails",
            data=data,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status >= 300:
                    raise RuntimeError(f"Resend HTTP {resp.status}")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Resend HTTP {exc.code}: {body}") from exc


def _build_live_provider() -> EmailProvider:
    key = (settings.RESEND_API_KEY or "").strip()
    sender = (settings.PSD_EMAIL_SENDER or "").strip()
    provider = (settings.PSD_EMAIL_PROVIDER or "smtp").lower().strip()

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
            log.warning("Auth email: RESEND_API_KEY / PSD_EMAIL_SENDER belum lengkap — mode echo")
            return EchoProvider()
        return _build_live_provider()

    if not settings.PSD_EMAIL_ENABLED:
        return EchoProvider()
    if not email_credentials_ready():
        log.warning("Email belum lengkap (RESEND_API_KEY / PSD_EMAIL_SENDER) — mode echo")
        return EchoProvider()
    return _build_live_provider()


def get_auth_provider() -> EmailProvider:
    return get_provider(auth=True)
