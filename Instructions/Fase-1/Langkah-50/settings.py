"""Konfigurasi integrasi Gitea (Langkah 50)."""
import os


class Settings:
    # URL dasar Gitea (mis. https://git.psd.example). Tanpa trailing slash.
    BASE_URL = os.environ.get("PSD_GITEA_BASE_URL", "http://localhost:3000").rstrip("/")
    # Token admin Gitea untuk provisioning mesin-ke-mesin (buat repo/user).
    ADMIN_TOKEN = os.environ.get("PSD_GITEA_ADMIN_TOKEN", "")
    DEFAULT_BRANCH = os.environ.get("PSD_GITEA_DEFAULT_BRANCH", "main")

    # Model namespace kepemilikan repo di Gitea:
    #   "user" — satu akun Gitea per pengguna PSD (cocok dgn OIDC auto-link).
    #   "org"  — semua repo di bawah satu organisasi.
    NAMESPACE_MODE = os.environ.get("PSD_GITEA_NAMESPACE_MODE", "user")
    ORG = os.environ.get("PSD_GITEA_ORG", "psd")


settings = Settings()
