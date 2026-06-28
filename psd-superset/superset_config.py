# Superset PSD (Langkah 53) — embedded + guest token
import os

SECRET_KEY = os.environ.get("SUPERSET_SECRET_KEY", "ganti-di-produksi")
SQLALCHEMY_DATABASE_URI = os.environ.get(
    "SUPERSET_DATABASE_URI",
    "postgresql+psycopg2://superset:superset@superset-db:5432/superset",
)
REDIS_HOST = os.environ.get("REDIS_HOST", "redis")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))

FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
}

GUEST_ROLE_NAME = "Public"
GUEST_TOKEN_JWT_SECRET = os.environ.get("GUEST_TOKEN_JWT_SECRET", "ganti-guest-jwt")
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"
GUEST_TOKEN_JWT_EXP_SECONDS = 3600

WTF_CSRF_ENABLED = True
ENABLE_PROXY_FIX = True

# OAuth PSD (Langkah 48) — analis login via OIDC; penonton embed pakai guest token.
AUTH_TYPE = 4  # AUTH_OAUTH
OAUTH_PROVIDERS = [
    {
        "name": "psd",
        "icon": "fa-user",
        "token_key": "access_token",
        "remote_app": {
            "client_id": "superset",
            "client_secret": os.environ.get("PSD_OIDC_CLIENT_SECRET", ""),
            "client_kwargs": {"scope": "openid profile email"},
            "access_token_url": f"{os.environ.get('PSD_OIDC_ISSUER', '').rstrip('/')}/oauth/token",
            "authorize_url": f"{os.environ.get('PSD_OIDC_ISSUER', '').rstrip('/')}/oauth/authorize",
            "api_base_url": f"{os.environ.get('PSD_OIDC_ISSUER', '').rstrip('/')}/",
            "userinfo_endpoint": f"{os.environ.get('PSD_OIDC_ISSUER', '').rstrip('/')}/oauth/userinfo",
        },
    }
]
