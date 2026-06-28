"""
Model data untuk OAuth2/OIDC Provider PSD (Langkah 48).

Catatan integrasi:
- Modul ini memakai declarative Base sendiri agar SELF-CONTAINED & bisa diuji
  tanpa menyentuh aplikasi utama. Bila Anda ingin SATU metadata untuk migrasi,
  ganti baris `Base = declarative_base()` di bawah dengan `from app.db import Base`.
  Nama tabel sudah diberi prefix `oauth_` agar tidak bertabrakan.
"""
from __future__ import annotations

import time

from sqlalchemy import BigInteger, Boolean, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class OAuthClient(Base):
    """Klien terdaftar (Gitea, JupyterHub, Superset, atau pihak ketiga)."""
    __tablename__ = "oauth_clients"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    # sha256(secret) hex. Kosong/"" untuk klien publik (PKCE-only).
    client_secret_hash: Mapped[str] = mapped_column(String(128), default="")
    name: Mapped[str] = mapped_column(String(120))
    # newline-separated; pencocokan EXACT MATCH (paling aman).
    redirect_uris: Mapped[str] = mapped_column(Text)
    # space-separated; scope yang boleh diminta klien ini.
    allowed_scopes: Mapped[str] = mapped_column(Text)
    # Klien first-party milik PSD → lewati layar consent.
    is_internal: Mapped[bool] = mapped_column(Boolean, default=False)
    # Confidential = punya secret (server-side). Public = SPA/native (PKCE wajib).
    is_confidential: Mapped[bool] = mapped_column(Boolean, default=True)

    def redirect_uri_list(self) -> list[str]:
        return [u.strip() for u in self.redirect_uris.splitlines() if u.strip()]

    def scope_set(self) -> set[str]:
        return set(self.allowed_scopes.split())

    def check_redirect_uri(self, uri: str) -> bool:
        return uri in self.redirect_uri_list()


class OAuthAuthorizationCode(Base):
    """Kode otorisasi sekali pakai, umur pendek (~60 dtk)."""
    __tablename__ = "oauth_authorization_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    client_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    redirect_uri: Mapped[str] = mapped_column(Text)
    scope: Mapped[str] = mapped_column(Text)
    nonce: Mapped[str | None] = mapped_column(String(255), nullable=True)
    code_challenge: Mapped[str | None] = mapped_column(String(128), nullable=True)
    code_challenge_method: Mapped[str | None] = mapped_column(String(10), nullable=True)
    auth_time: Mapped[int] = mapped_column(BigInteger)
    expires_at: Mapped[int] = mapped_column(BigInteger)
    used: Mapped[bool] = mapped_column(Boolean, default=False)

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class OAuthToken(Base):
    """Access token (opaque, dapat dicabut) + refresh token opsional."""
    __tablename__ = "oauth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    access_token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    refresh_token: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    client_id: Mapped[str] = mapped_column(String(64), index=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    scope: Mapped[str] = mapped_column(Text)
    token_type: Mapped[str] = mapped_column(String(20), default="Bearer")
    issued_at: Mapped[int] = mapped_column(BigInteger)
    access_token_expires_at: Mapped[int] = mapped_column(BigInteger)
    refresh_token_expires_at: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    revoked: Mapped[bool] = mapped_column(Boolean, default=False)

    def access_expired(self) -> bool:
        return time.time() > self.access_token_expires_at


class OAuthConsent(Base):
    """Persetujuan pengguna atas klien tertentu (agar tak diminta ulang)."""
    __tablename__ = "oauth_consents"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(String(64), index=True)
    client_id: Mapped[str] = mapped_column(String(64), index=True)
    scope: Mapped[str] = mapped_column(Text)
    granted_at: Mapped[int] = mapped_column(BigInteger)
