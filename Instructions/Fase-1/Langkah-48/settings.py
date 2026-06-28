"""Konfigurasi OAuth/OIDC Provider PSD. Semua via environment, ada default dev."""
import os


class Settings:
    # URL publik provider (HARUS https di produksi; tanpa trailing slash).
    ISSUER = os.environ.get("PSD_OIDC_ISSUER", "http://localhost:8000").rstrip("/")

    # Umur kode otorisasi (detik). Pendek = aman. Spec OAuth menyarankan <= 60 dtk.
    AUTHORIZATION_CODE_TTL = int(os.environ.get("PSD_OIDC_CODE_TTL", "60"))
    ACCESS_TOKEN_TTL = int(os.environ.get("PSD_OIDC_ACCESS_TTL", "3600"))           # 1 jam
    REFRESH_TOKEN_TTL = int(os.environ.get("PSD_OIDC_REFRESH_TTL", str(60 * 60 * 24 * 30)))  # 30 hari
    ID_TOKEN_TTL = int(os.environ.get("PSD_OIDC_ID_TTL", "3600"))

    # Halaman login PSD (Langkah 14). authorize akan bounce ke sini bila belum login.
    LOGIN_URL = os.environ.get("PSD_LOGIN_URL", "/login")

    # Kunci penanda untuk JWKS. Ganti saat rotasi kunci.
    KEY_ID = os.environ.get("PSD_OIDC_KEY_ID", "psd-key-1")


settings = Settings()
