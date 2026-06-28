"""Manajemen kunci RSA (RS256) untuk ID token + endpoint JWKS.

PRODUKSI: set PSD_OIDC_PRIVATE_KEY = isi PEM private key (string).
DEV: bila tak diset, kunci EPHEMERAL digenerate sekali per proses (token jadi
tidak valid setelah restart — cukup untuk uji lokal, JANGAN untuk produksi).

Buat kunci produksi:
    openssl genrsa -out psd_oidc.pem 2048
    export PSD_OIDC_PRIVATE_KEY="$(cat psd_oidc.pem)"
"""
import os
import threading

from authlib.jose import JsonWebKey

from .settings import settings

_lock = threading.Lock()
_cache: dict = {}


def _load_or_generate():
    pem = os.environ.get("PSD_OIDC_PRIVATE_KEY")
    opts = {"kid": settings.KEY_ID, "use": "sig", "alg": "RS256"}
    if pem:
        return JsonWebKey.import_key(pem, opts)
    # Fallback dev — ephemeral.
    return JsonWebKey.generate_key("RSA", 2048, opts, is_private=True)


def get_private_key():
    with _lock:
        if "key" not in _cache:
            _cache["key"] = _load_or_generate()
        return _cache["key"]


def get_kid() -> str:
    return get_private_key().as_dict().get("kid", settings.KEY_ID)


def get_jwks() -> dict:
    """Dokumen JWKS publik (untuk verifikasi ID token oleh konsumen)."""
    pub = get_private_key().as_dict(is_private=False)
    pub.setdefault("use", "sig")
    pub.setdefault("alg", "RS256")
    return {"keys": [pub]}
