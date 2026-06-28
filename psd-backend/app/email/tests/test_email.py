"""Uji modul email (Langkah 59) — 8 skenario scaffold."""
from __future__ import annotations

import json
from email import message_from_string
from unittest.mock import MagicMock, patch

import pytest

from app.email.dispatch import build_digest_for_user, dispatch_event_email
from app.email.preferences import resolve_mode, should_digest, should_send_now, user_email_prefs
from app.email.provider import EchoProvider, ResendHttpProvider, SMTPProvider
from app.email.store import MemoryDedup, MemoryDigest
from app.email.templates import render_event_email
from app.email.unsubscribe import make_unsubscribe_token, verify_unsubscribe_token


def test_smtp_build_mime():
    sent: list[str] = []

    class FakeSMTP:
        def __init__(self, host, port, timeout=30):
            self.host = host

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def starttls(self):
            pass

        def login(self, user, password):
            assert user == "resend"

        def sendmail(self, sender, recipients, raw):
            sent.append(raw)

    with patch("app.email.provider.smtplib.SMTP", FakeSMTP):
        SMTPProvider(
            host="smtp.resend.com",
            port=587,
            user="resend",
            password="re_key",
            sender="noreply@test.com",
        ).send("u@x.com", "Subjek", "<p>Hi</p>", "Hi")

    msg = message_from_string(sent[0])
    assert msg["To"] == "u@x.com"
    assert msg["Subject"] == "Subjek"
    parts = [p.get_payload(decode=True).decode() for p in msg.walk() if p.get_content_type() in ("text/plain", "text/html")]
    assert any("Hi" in part for part in parts)


def test_resend_http_request():
    captured: dict = {}

    class FakeResp:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def fake_urlopen(req, timeout=30):
        captured["url"] = req.full_url
        captured["headers"] = dict(req.header_items())
        captured["body"] = json.loads(req.data.decode())
        return FakeResp()

    with patch("app.email.provider.urllib.request.urlopen", fake_urlopen):
        ResendHttpProvider(api_key="re_test", sender="noreply@test.com").send(
            "u@x.com", "Judul", "<b>x</b>", "x"
        )

    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["headers"]["Authorization"] == "Bearer re_test"
    assert captured["body"]["to"] == ["u@x.com"]


def test_render_template_fallback():
    subject, text, html = render_event_email(
        "unknown_event",
        title="Judul kustom",
        body="Isi",
        link="/x",
        app_base_url="https://psd.test",
        unsubscribe_url="https://psd.test/unsub",
    )
    assert subject == "Judul kustom"
    assert "Isi" in text
    assert "https://psd.test/x" in text
    assert "Berhenti berlangganan" in html


def test_preference_gating():
    prefs = {"email_enabled": True, "default_mode": "immediate", "events": {"pr_commented": "digest"}}
    assert should_send_now(prefs, "pr_opened")
    assert not should_send_now(prefs, "pr_commented")
    assert should_digest(prefs, "pr_commented")

    off = user_email_prefs({"notifications": {"email_competition": False}})
    assert resolve_mode(off, "competition") == "off"


def test_unsubscribe_token_roundtrip_and_tamper():
    token = make_unsubscribe_token("usr_abc")
    assert verify_unsubscribe_token(token) == "usr_abc"
    bad = token[:-1] + ("0" if token[-1] != "0" else "1")
    assert verify_unsubscribe_token(bad) is None


def test_dispatch_footer_and_send(monkeypatch):
    provider = EchoProvider()
    dedup = MemoryDedup()
    sent_to: list[str] = []

    def fake_send(to, subject, html, text=None):
        sent_to.append(to)

    provider.send = fake_send  # type: ignore[method-assign]

    monkeypatch.setattr("app.email.seams.get_provider", lambda: provider)
    monkeypatch.setattr("app.email.seams.get_dedup", lambda: dedup)
    monkeypatch.setattr("app.email.seams.user_email", lambda uid: "user@test.com")
    monkeypatch.setattr(
        "app.email.seams.user_email_prefs_sync",
        lambda uid: {"email_enabled": True, "default_mode": "immediate", "events": {}},
    )

    status = dispatch_event_email(
        notification_id="ntf_1",
        user_id="u1",
        event_type="pr_opened",
        title="PR baru",
        body="Repo x",
        link="/repos/x",
    )
    assert status == "sent"
    assert sent_to == ["user@test.com"]


def test_opt_out_and_dedup(monkeypatch):
    provider = MagicMock()
    dedup = MemoryDedup()
    monkeypatch.setattr("app.email.seams.get_provider", lambda: provider)
    monkeypatch.setattr("app.email.seams.get_dedup", lambda: dedup)
    monkeypatch.setattr("app.email.seams.user_email", lambda uid: "user@test.com")
    monkeypatch.setattr(
        "app.email.seams.user_email_prefs_sync",
        lambda uid: {"email_enabled": False, "default_mode": "off", "events": {}},
    )

    assert dispatch_event_email(
        notification_id="ntf_2",
        user_id="u1",
        event_type="event",
        title="X",
    ) == "skipped"
    provider.send.assert_not_called()

    monkeypatch.setattr(
        "app.email.seams.user_email_prefs_sync",
        lambda uid: {"email_enabled": True, "default_mode": "immediate", "events": {}},
    )
    dispatch_event_email(notification_id="ntf_3", user_id="u1", event_type="event", title="A")
    assert dispatch_event_email(notification_id="ntf_3", user_id="u1", event_type="event", title="A") == "dedup"


def test_digest_build(monkeypatch):
    provider = MagicMock()
    digest = MemoryDigest()
    dedup = MemoryDedup()
    digest.append("u1", {"notification_id": "n1", "title": "A", "body": "b", "link": "/a"})
    digest.append("u1", {"notification_id": "n2", "title": "B", "body": "", "link": None})

    monkeypatch.setattr("app.email.seams.get_provider", lambda: provider)
    monkeypatch.setattr("app.email.seams.get_dedup", lambda: dedup)
    monkeypatch.setattr("app.email.seams.get_digest_store", lambda: digest)
    monkeypatch.setattr("app.email.seams.user_email", lambda uid: "user@test.com")
    monkeypatch.setattr(
        "app.email.seams.user_email_prefs_sync",
        lambda uid: {"email_enabled": True, "default_mode": "digest", "events": {}},
    )
    monkeypatch.setattr("app.email.seams.pending_digest_items", digest.drain)
    monkeypatch.setattr("app.email.seams.list_digest_user_ids", digest.list_user_ids)

    assert build_digest_for_user("u1") == "sent"
    provider.send.assert_called_once()
    assert build_digest_for_user("u1") == "empty"
