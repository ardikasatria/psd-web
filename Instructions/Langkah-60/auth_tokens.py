"""
Token email autentikasi (verify email & reset password).

BEDA dari token unsubscribe (yang berumur panjang). Token ini:
  - Bertanda tangan HMAC (tahan pemalsuan).
  - Berumur PENDEK (exp): verify ~24 jam, reset ~30–60 menit.
  - Terikat TUJUAN (purpose): token verify tak bisa dipakai untuk reset.
  - SEKALI PAKAI & hanya-terbaru-valid via "nonce" per (user, purpose):
      * issue()  merotasi nonce → token lama langsung invalid.
      * consume() merotasi nonce → token tak bisa dipakai ulang.

Store nonce: Redis di produksi; in-memory untuk dev/uji.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time


class AuthTokenError(ValueError):
    pass


class TokenService:
    def __init__(self, secret: str, store, *, clock=time.time):
        self.secret = secret
        self.store = store
        self.clock = clock

    def _sign(self, payload_b64: str) -> str:
        return hmac.new(self.secret.encode(), payload_b64.encode(),
                        hashlib.sha256).hexdigest()

    def issue(self, user_id: str, purpose: str, *, ttl: int) -> str:
        nonce = secrets.token_urlsafe(8)
        self.store.set_nonce(str(user_id), purpose, nonce)   # rotasi → token lama invalid
        payload = {"uid": str(user_id), "p": purpose,
                   "exp": int(self.clock()) + ttl, "n": nonce}
        pb = base64.urlsafe_b64encode(
            json.dumps(payload, separators=(",", ":")).encode()).decode()
        return f"{pb}.{self._sign(pb)}"

    def verify(self, token: str, purpose: str) -> dict:
        try:
            pb, sig = token.rsplit(".", 1)
        except ValueError:
            raise AuthTokenError("format token salah.")
        if not hmac.compare_digest(self._sign(pb), sig):
            raise AuthTokenError("tanda tangan tidak valid.")
        payload = json.loads(base64.urlsafe_b64decode(pb.encode()))
        if payload.get("p") != purpose:
            raise AuthTokenError("tujuan token tidak sesuai.")
        if self.clock() >= payload["exp"]:
            raise AuthTokenError("token kedaluwarsa.")
        if self.store.get_nonce(payload["uid"], purpose) != payload["n"]:
            raise AuthTokenError("token sudah dipakai atau digantikan.")
        return {"user_id": payload["uid"]}

    def consume(self, user_id: str, purpose: str) -> None:
        """Panggil SETELAH aksi berhasil (verifikasi/ganti password) → token mati."""
        self.store.set_nonce(str(user_id), purpose, secrets.token_urlsafe(8))


class InMemoryNonceStore:
    def __init__(self):
        self._d: dict[tuple[str, str], str] = {}

    def set_nonce(self, user_id: str, purpose: str, nonce: str) -> None:
        self._d[(str(user_id), purpose)] = nonce

    def get_nonce(self, user_id: str, purpose: str) -> str | None:
        return self._d.get((str(user_id), purpose))
