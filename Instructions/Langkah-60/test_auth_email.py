"""
Uji email autentikasi (verify & reset) — sifat keamanan token.
"""
import pytest

from app.email import auth_email
from app.email.auth_tokens import (
    AuthTokenError,
    InMemoryNonceStore,
    TokenService,
)


def make_svc(clock=None):
    store = InMemoryNonceStore()
    return TokenService("rahasia", store, clock=clock or (lambda: 1000.0)), store


# -------------------- token --------------------
def test_issue_and_verify_ok():
    svc, _ = make_svc()
    tok = svc.issue("42", "password_reset", ttl=1800)
    assert svc.verify(tok, "password_reset")["user_id"] == "42"


def test_wrong_purpose_rejected():
    svc, _ = make_svc()
    tok = svc.issue("42", "email_verify", ttl=3600)
    with pytest.raises(AuthTokenError):
        svc.verify(tok, "password_reset")          # tujuan beda → tolak


def test_tampered_signature_rejected():
    svc, _ = make_svc()
    tok = svc.issue("42", "password_reset", ttl=1800)
    pb, _sig = tok.rsplit(".", 1)
    with pytest.raises(AuthTokenError):
        svc.verify(pb + ".deadbeef", "password_reset")


def test_expiry_rejected():
    t = [1000.0]
    svc, _ = make_svc(clock=lambda: t[0])
    tok = svc.issue("42", "password_reset", ttl=60)
    t[0] = 1061                                     # lewat 60 dtk
    with pytest.raises(AuthTokenError):
        svc.verify(tok, "password_reset")


def test_only_latest_token_valid():
    svc, _ = make_svc()
    old = svc.issue("42", "password_reset", ttl=1800)
    new = svc.issue("42", "password_reset", ttl=1800)   # rotasi nonce
    assert svc.verify(new, "password_reset")["user_id"] == "42"
    with pytest.raises(AuthTokenError):
        svc.verify(old, "password_reset")           # token lama mati


def test_single_use_after_consume():
    svc, _ = make_svc()
    tok = svc.issue("42", "password_reset", ttl=1800)
    assert svc.verify(tok, "password_reset")["user_id"] == "42"
    svc.consume("42", "password_reset")             # setelah ganti password
    with pytest.raises(AuthTokenError):
        svc.verify(tok, "password_reset")           # tak bisa dipakai ulang


# -------------------- email auth (wajib, tanpa unsubscribe) --------------------
class RecProvider:
    def __init__(self): self.sent = []
    def send(self, *, to, subject, html, text=None):
        self.sent.append({"to": to, "subject": subject, "html": html, "text": text})
        return {"ok": True}


def test_send_verification_builds_url_no_unsubscribe():
    prov = RecProvider()
    svc, _ = make_svc()
    tok = svc.issue("42", auth_email.PURPOSE_VERIFY, ttl=auth_email.VERIFY_TTL)
    auth_email.send_verification(prov, to_email="budi@itera.ac.id", token=tok,
                                 base_url="https://psd.example")
    sent = prov.sent[0]
    assert "/auth/verify-email?token=" in sent["html"]
    assert "unsubscribe" not in sent["html"].lower()   # email wajib → tanpa unsubscribe


def test_send_password_reset_builds_url():
    prov = RecProvider()
    svc, _ = make_svc()
    tok = svc.issue("42", auth_email.PURPOSE_RESET, ttl=auth_email.RESET_TTL)
    auth_email.send_password_reset(prov, to_email="budi@itera.ac.id", token=tok,
                                   base_url="https://psd.example/")
    assert "/auth/reset-password?token=" in prov.sent[0]["html"]
    assert "30 menit" in prov.sent[0]["html"]
