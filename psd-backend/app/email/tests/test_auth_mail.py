"""Uji template & pengiriman email auth (Langkah 60)."""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from app.email.auth_mail import (
    send_reset_password_email,
    send_verify_email,
)
from app.email.auth_templates import render_auth_email


def test_render_verify_contains_cta_and_indonesian():
    subject, text, html = render_auth_email(
        "verify",
        recipient_name="Budi",
        action_url="https://psd.test/verify-email?token=abc",
        expiry_minutes=60,
    )
    assert "Verifikasi email" in subject
    assert "Halo Budi" in text
    assert "60 menit" in text
    assert "Verifikasi email" in html
    assert "https://psd.test/verify-email?token=abc" in html
    assert "Projek Sains Data" in html


def test_render_reset_password_security_note():
    _, text, html = render_auth_email(
        "reset_password",
        recipient_name="Ani",
        action_url="https://psd.test/reset-password?token=x",
        expiry_minutes=30,
    )
    assert "abaikan" in text.lower()
    assert "Atur ulang kata sandi" in html


def test_render_change_email():
    subject, _, html = render_auth_email(
        "change_email",
        recipient_name="Sari",
        action_url="https://psd.test/verify-email?token=y",
        expiry_minutes=60,
    )
    assert "Konfirmasi" in subject
    assert "Konfirmasi email baru" in html


def test_send_verify_uses_provider(monkeypatch):
    provider = MagicMock()
    monkeypatch.setattr("app.email.auth_mail.get_provider", lambda: provider)
    monkeypatch.setattr("app.email.auth_mail.settings.DEV_EMAIL_ECHO", False)
    monkeypatch.setattr("app.email.auth_mail.settings.RESEND_API_KEY", "re_test")
    monkeypatch.setattr("app.email.auth_mail.settings.PSD_EMAIL_ENABLED", True)
    monkeypatch.setattr("app.email.auth_mail.settings.APP_BASE_URL", "https://psd.test")

    send_verify_email("user@test.com", name="Budi", token="tok123", expiry_minutes=60)
    provider.send.assert_called_once()
    args = provider.send.call_args[0]
    assert args[0] == "user@test.com"
    assert "Verifikasi" in args[1]
    assert "tok123" in args[2]


def test_send_reset_password(monkeypatch):
    provider = MagicMock()
    monkeypatch.setattr("app.email.auth_mail.get_provider", lambda: provider)
    monkeypatch.setattr("app.email.auth_mail.settings.DEV_EMAIL_ECHO", False)
    monkeypatch.setattr("app.email.auth_mail.settings.RESEND_API_KEY", "re_test")
    monkeypatch.setattr("app.email.auth_mail.settings.PSD_EMAIL_ENABLED", True)
    monkeypatch.setattr("app.email.auth_mail.settings.APP_BASE_URL", "https://psd.test")

    send_reset_password_email("user@test.com", name="Ani", token="rst", expiry_minutes=30)
    provider.send.assert_called_once()
    html = provider.send.call_args[0][2]
    assert "reset-password?token=rst" in html


def test_send_verify_does_not_raise_when_provider_fails(monkeypatch):
    class FailProvider:
        def send(self, *args, **kwargs):
            raise RuntimeError("smtp down")

    monkeypatch.setattr("app.email.auth_mail.get_provider", lambda: FailProvider())
    monkeypatch.setattr("app.email.auth_mail.settings.DEV_EMAIL_ECHO", False)
    monkeypatch.setattr("app.email.auth_mail.settings.APP_BASE_URL", "https://psd.test")

    send_verify_email("user@test.com", name="Budi", token="tok123", expiry_minutes=60)
