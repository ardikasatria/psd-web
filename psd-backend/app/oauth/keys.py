"""Manajemen kunci RSA (RS256) untuk ID token + endpoint JWKS."""
import threading
from pathlib import Path

from authlib.jose import JsonWebKey

from app.core.config import settings as app_settings
from app.oauth.settings import settings

_lock = threading.Lock()
_cache: dict = {}


def _read_pem() -> str:
    pem = app_settings.PSD_OIDC_PRIVATE_KEY.strip()
    if pem:
        return pem
    key_file = app_settings.PSD_OIDC_PRIVATE_KEY_FILE.strip()
    if key_file:
        path = Path(key_file)
        if path.is_file():
            return path.read_text()
    return ""


def _load_or_generate():
    pem = _read_pem()
    opts = {"kid": settings.KEY_ID, "use": "sig", "alg": "RS256"}
    if pem:
        return JsonWebKey.import_key(pem, opts)
    return JsonWebKey.generate_key("RSA", 2048, opts, is_private=True)


def get_private_key():
    with _lock:
        if "key" not in _cache:
            _cache["key"] = _load_or_generate()
        return _cache["key"]


def get_kid() -> str:
    return get_private_key().as_dict().get("kid", settings.KEY_ID)


def get_jwks() -> dict:
    pub = get_private_key().as_dict(is_private=False)
    pub.setdefault("use", "sig")
    pub.setdefault("alg", "RS256")
    return {"keys": [pub]}
