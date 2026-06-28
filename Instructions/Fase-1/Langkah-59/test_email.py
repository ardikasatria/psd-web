"""
Uji backend email (Resend) — murni Python + httpx.MockTransport. Tanpa kirim nyata.
"""
import json

import httpx
import pytest

from app.email import dispatch, preferences, templates, unsubscribe
from app.email.dispatch import InMemoryDedup
from app.email.provider import ResendProvider, SMTPProvider


# -------------------- provider SMTP --------------------
class FakeSMTP:
    def __init__(self): self.sent = []; self.quit_called = False
    def send_message(self, msg): self.sent.append(msg)
    def quit(self): self.quit_called = True


def test_smtp_provider_builds_message():
    fake = FakeSMTP()
    p = SMTPProvider(host="smtp.resend.com", port=465, username="resend",
                     password="re_key", sender="PSD <no-reply@psd.example>",
                     smtp_factory=lambda: fake)
    p.send(to="budi@itera.ac.id", subject="Halo", html="<b>hai</b>", text="hai")
    assert fake.quit_called
    msg = fake.sent[0]
    assert msg["To"] == "budi@itera.ac.id"
    assert msg["Subject"] == "Halo"
    assert msg["From"].startswith("PSD")
    # ada alternatif HTML
    assert any(part.get_content_type() == "text/html" for part in msg.iter_parts())


# -------------------- provider Resend HTTP --------------------
def test_resend_http_provider_request():
    seen = {}

    def handler(req: httpx.Request):
        seen["path"] = req.url.path
        seen["auth"] = req.headers.get("authorization")
        seen["body"] = json.loads(req.content)
        return httpx.Response(200, json={"id": "email_123"})

    http = httpx.Client(transport=httpx.MockTransport(handler))
    p = ResendProvider(api_key="re_key", sender="no-reply@psd.example", http=http)
    out = p.send(to="budi@itera.ac.id", subject="Halo", html="<b>hai</b>")
    assert seen["path"] == "/emails"
    assert seen["auth"] == "Bearer re_key"
    assert seen["body"]["to"] == ["budi@itera.ac.id"]
    assert out["id"] == "email_123"


# -------------------- template --------------------
def test_template_render_known_and_generic():
    s, h, t = templates.render("pr_merged", {"repo": "lab/iris", "index": 5})
    assert "merge" in s.lower() and "lab/iris" in h
    s2, h2, _ = templates.render("tak_dikenal", {"title": "X", "message": "isi"})
    assert s2 == "X" and "isi" in h2          # fallback generic


# -------------------- preferensi --------------------
def test_preferences_gating():
    assert preferences.should_send_now({"email_enabled": True}, "pr_opened") is True
    # unsubscribe global
    assert preferences.should_send_now({"email_enabled": False}, "pr_opened") is False
    # override per-peristiwa → digest (bukan immediate)
    prefs = {"email_enabled": True, "events": {"pr_commented": "digest"}}
    assert preferences.should_send_now(prefs, "pr_commented") is False
    assert preferences.should_digest(prefs, "pr_commented") is True
    # off
    assert preferences.resolve_mode({"email_enabled": True,
                                     "events": {"quiz_graded": "off"}}, "quiz_graded") == "off"


# -------------------- unsubscribe --------------------
def test_unsubscribe_token_roundtrip_and_tamper():
    tok = unsubscribe.make_token("42", "secret")
    assert unsubscribe.verify_token(tok, "secret")["user_id"] == "42"
    with pytest.raises(ValueError):
        unsubscribe.verify_token(tok, "secret-salah")


# -------------------- dispatch --------------------
class RecProvider:
    def __init__(self): self.sent = []
    def send(self, *, to, subject, html, text=None):
        self.sent.append({"to": to, "subject": subject, "html": html})
        return {"ok": True}


def _event(et="pr_merged", nid="n1"):
    return {"type": et, "notification_id": nid, "user_id": 42,
            "data": {"repo": "lab/iris", "index": 5}}


def test_dispatch_sends_with_unsubscribe_footer():
    prov = RecProvider()
    res = dispatch.send_event_email(
        _event(), to_email="budi@itera.ac.id",
        prefs={"email_enabled": True}, provider=prov, dedup=InMemoryDedup(),
        unsubscribe_secret="s", base_url="https://psd.example")
    assert res["status"] == "sent"
    assert "unsubscribe" in prov.sent[0]["html"].lower()


def test_dispatch_respects_optout_and_dedup():
    prov = RecProvider()
    dedup = InMemoryDedup()
    # opt-out global
    r1 = dispatch.send_event_email(
        _event(), to_email="x@y", prefs={"email_enabled": False},
        provider=prov, dedup=dedup, unsubscribe_secret="s", base_url="b")
    assert r1["status"] == "skipped_pref"
    assert prov.sent == []
    # dedup: kirim sekali, kirim ulang nid sama → skip
    dispatch.send_event_email(_event(nid="dup"), to_email="x@y",
                              prefs={"email_enabled": True}, provider=prov,
                              dedup=dedup, unsubscribe_secret="s", base_url="b")
    r3 = dispatch.send_event_email(_event(nid="dup"), to_email="x@y",
                                   prefs={"email_enabled": True}, provider=prov,
                                   dedup=dedup, unsubscribe_secret="s", base_url="b")
    assert r3["status"] == "skipped_dup"
    assert len(prov.sent) == 1


# -------------------- digest --------------------
def test_build_digest_aggregates():
    items = [
        {"type": "pr_commented", "data": {"title": "X", "message": "k1"}},
        {"type": "quiz_graded", "data": {"quiz_title": "Kuis 1", "score": 90}},
    ]
    subject, html, text = dispatch.build_digest(items)
    assert "2" in subject
    assert "Kuis 1" in html and "k1" in text
