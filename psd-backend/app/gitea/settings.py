"""Konfigurasi integrasi Gitea."""
from app.core.config import settings as app_settings


class Settings:
    ENABLED = app_settings.PSD_GITEA_ENABLED
    BASE_URL = app_settings.PSD_GITEA_BASE_URL.rstrip("/")
    ADMIN_TOKEN = app_settings.PSD_GITEA_ADMIN_TOKEN
    DEFAULT_BRANCH = app_settings.PSD_GITEA_DEFAULT_BRANCH
    NAMESPACE_MODE = app_settings.PSD_GITEA_NAMESPACE_MODE
    ORG = app_settings.PSD_GITEA_ORG


settings = Settings()
