"""
Provider email (lintas Fase 0 & 1). Dua implementasi Resend di balik satu antarmuka:
  - SMTPProvider  : smtp.resend.com (user 'resend', password = API key).
  - ResendProvider: HTTP API https://api.resend.com/emails (Authorization: Bearer <key>).

Keduanya bisa diinject transport/koneksi tiruan untuk pengujian.
Pengiriman dijalankan di worker Celery (Langkah 49), bukan di jalur request.
"""
from __future__ import annotations

from email.message import EmailMessage

import httpx


class EmailError(RuntimeError):
    pass


class SMTPProvider:
    """Resend via SMTP. host=smtp.resend.com, port=465(SSL)/587, user='resend',
    password=<RESEND_API_KEY>."""
    def __init__(self, *, host: str, port: int, username: str, password: str,
                 sender: str, use_ssl: bool = True, smtp_factory=None):
        self.host, self.port = host, port
        self.username, self.password = username, password
        self.sender, self.use_ssl = sender, use_ssl
        self.smtp_factory = smtp_factory          # callable -> klien SMTP (uji)

    def _connect(self):
        if self.smtp_factory:
            return self.smtp_factory()
        import smtplib
        s = (smtplib.SMTP_SSL(self.host, self.port) if self.use_ssl
             else smtplib.SMTP(self.host, self.port))
        if not self.use_ssl:
            s.starttls()
        s.login(self.username, self.password)
        return s

    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> dict:
        msg = EmailMessage()
        msg["From"] = self.sender
        msg["To"] = to
        msg["Subject"] = subject
        msg.set_content(text or "Email ini memerlukan tampilan HTML.")
        msg.add_alternative(html, subtype="html")
        client = self._connect()
        try:
            client.send_message(msg)
        finally:
            try:
                client.quit()
            except Exception:
                pass
        return {"provider": "smtp", "to": to, "subject": subject}


class ResendProvider:
    """Resend via HTTP API (alternatif SMTP)."""
    def __init__(self, *, api_key: str, sender: str, http: httpx.Client | None = None,
                 base_url: str = "https://api.resend.com"):
        self.api_key, self.sender = api_key, sender
        self.base_url = base_url.rstrip("/")
        self.http = http or httpx.Client(timeout=30.0)

    def send(self, *, to: str, subject: str, html: str, text: str | None = None) -> dict:
        body = {"from": self.sender, "to": [to], "subject": subject, "html": html}
        if text:
            body["text"] = text
        r = self.http.post(f"{self.base_url}/emails",
                           headers={"Authorization": f"Bearer {self.api_key}"}, json=body)
        if r.status_code >= 400:
            raise EmailError(f"Resend {r.status_code}: {r.text}")
        return r.json()
