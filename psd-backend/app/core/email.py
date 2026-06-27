import logging

from app.core.config import settings

log = logging.getLogger("psd.email")


def send_email(to: str, subject: str, body: str) -> None:
    if settings.DEV_EMAIL_ECHO:
        log.warning("EMAIL → %s | %s\n%s", to, subject, body)
        return
    raise NotImplementedError("Konfigurasi SMTP untuk produksi")
