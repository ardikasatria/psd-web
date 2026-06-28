"""Konfigurasi OAuth/OIDC Provider PSD."""
from app.core.config import settings as app_settings


class Settings:
    ISSUER = app_settings.PSD_OIDC_ISSUER.rstrip("/")
    AUTHORIZATION_CODE_TTL = app_settings.PSD_OIDC_CODE_TTL
    ACCESS_TOKEN_TTL = app_settings.PSD_OIDC_ACCESS_TTL
    REFRESH_TOKEN_TTL = app_settings.PSD_OIDC_REFRESH_TTL
    ID_TOKEN_TTL = app_settings.PSD_OIDC_ID_TTL
    LOGIN_URL = f"{app_settings.APP_BASE_URL.rstrip('/')}/login"
    KEY_ID = app_settings.PSD_OIDC_KEY_ID


settings = Settings()
