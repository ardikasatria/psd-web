import json

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    API_PREFIX: str = "/api/v1"
    APP_NAME: str = "Projek Sains Data API"

    # Database (asyncpg untuk app)
    DATABASE_URL: str = "postgresql+asyncpg://psd:psd@localhost:5432/psd"

    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS — origin frontend Next.js
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Auth (dipakai mulai Langkah 4)
    JWT_SECRET: str = "ganti-di-produksi"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24

    # MinIO (opsional, Langkah 9)
    MINIO_ENDPOINT: str = "localhost:9000"
    MINIO_KEY: str = "psd"
    MINIO_SECRET: str = "psd-secret"
    MINIO_BUCKET: str = "psd-assets"
    MINIO_SECURE: bool = False
    STORAGE_ENABLED: bool = False

    S3_ENDPOINT_URL: str | None = "http://localhost:9000"
    S3_REGION: str = "us-east-1"
    S3_ACCESS_KEY: str = "psd"
    S3_SECRET_KEY: str = "psd-secret"
    S3_MEDIA_BUCKET: str = "psd-media"
    S3_PUBLIC_BASE_URL: str = "http://localhost:9000/psd-media"

    S3_ASSETS_BUCKET: str = "psd-assets"
    S3_ASSETS_PUBLIC_BASE_URL: str = "http://localhost:9000/psd-assets"

    S3_SUBMISSIONS_BUCKET: str = "psd-submissions"

    APP_BASE_URL: str = "http://localhost:3000"
    COOKIE_NAME: str = "psd_token"
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    COOKIE_DOMAIN: str | None = None
    DEV_EMAIL_ECHO: bool = True

    MEILI_URL: str = "http://localhost:7700"
    MEILI_KEY: str = "psd-search-key"

    PSD_OFFICIAL_USERNAME: str = "psd"

    TOS_VERSION: str = "2026-07"

    OPENAI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4o-mini"

    FACTORY_RUN_TIMEOUT_S: int = 90

    # Celery (Langkah 49 — prod; dev fallback BackgroundTasks)
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""
    PSD_USE_CELERY: bool = False

    # OAuth/OIDC Provider (Langkah 48)
    PSD_OIDC_ISSUER: str = "http://localhost:8000"
    PSD_OIDC_PRIVATE_KEY: str = ""
    PSD_OIDC_PRIVATE_KEY_FILE: str = ""
    PSD_OIDC_CODE_TTL: int = 60
    PSD_OIDC_ACCESS_TTL: int = 3600
    PSD_OIDC_REFRESH_TTL: int = 60 * 60 * 24 * 30
    PSD_OIDC_ID_TTL: int = 3600
    PSD_OIDC_KEY_ID: str = "psd-key-1"
    PSD_OAUTH_GIT_BASE_URL: str = "https://git.psd.example"
    PSD_OAUTH_HUB_BASE_URL: str = "https://hub.psd.example"
    PSD_OAUTH_BI_BASE_URL: str = "https://bi.psd.example"

    # Gitea (Langkah 50)
    PSD_GITEA_ENABLED: bool = False
    PSD_GITEA_BASE_URL: str = "http://localhost:3001"
    PSD_GITEA_ADMIN_TOKEN: str = ""
    PSD_GITEA_DEFAULT_BRANCH: str = "main"
    PSD_GITEA_NAMESPACE_MODE: str = "user"
    PSD_GITEA_ORG: str = "psd"
    PSD_GITEA_EMAIL_DOMAIN: str = "projeksainsdata.local"
    # Port SSH publik Gitea (22 = default; produksi biasanya 2222 agar tidak bentrok dengan sshd VM)
    PSD_GITEA_SSH_PORT: int = 22

    # Pull Request (Langkah 51)
    PSD_PR_DEFAULT_BRANCH: str = "main"
    PSD_PR_MERGE_METHOD: str = "merge"
    PSD_PR_DELETE_BRANCH: bool = True

    # JupyterHub (Langkah 52)
    PSD_HUB_ENABLED: bool = False

    # Superset (Langkah 53)
    PSD_SUPERSET_ENABLED: bool = False
    PSD_SUPERSET_API_URL: str = "http://superset:8088"
    PSD_SUPERSET_PUBLIC_URL: str = "https://bi.psd.example"
    PSD_SUPERSET_SERVICE_USER: str = "psd_service"
    PSD_SUPERSET_SERVICE_PASSWORD: str = ""
    PSD_SUPERSET_AUTH_PROVIDER: str = "db"
    PSD_SUPERSET_GOLD_DB_ID: int = 1
    PSD_SUPERSET_GOLD_SCHEMA: str = "gold"
    PSD_SUPERSET_EMBED_DOMAINS: str = "localhost"

    # Spark (Langkah 54 — opsional)
    PSD_SPARK_ENABLED: bool = False
    PSD_SPARK_MASTER: str = "local[*]"

    # MLflow (Langkah 55)
    PSD_MLFLOW_ENABLED: bool = False
    PSD_MLFLOW_TRACKING_URI: str = "http://mlflow:5000"
    PSD_MLFLOW_PUBLIC_URL: str = "https://ml.psd.example"
    PSD_MLFLOW_ARTIFACT_ROOT: str = "s3://psd-assets/mlflow/"

    # Serving (Langkah 56)
    PSD_SERVING_ENABLED: bool = False
    PSD_SERVING_REDIS_QUOTA: bool = True

    # AI Asisten (Langkah 57)
    PSD_ASSISTANT_ENABLED: bool = False
    PSD_ASSISTANT_REDIS_QUOTA: bool = True

    # Cache & performa (Langkah 58 — reaktif)
    PSD_PERF_ENABLED: bool = True
    PSD_PERF_CACHE_ENABLED: bool = False
    PSD_PERF_CACHE_AUTO: bool = True
    PSD_PERF_REDIS: bool = True
    PSD_PERF_SLOW_THRESHOLD_MS: float = 200.0
    PSD_PERF_MIN_SAMPLES: int = 30

    # Email SMTP / Resend (Langkah 59)
    PSD_EMAIL_ENABLED: bool = False
    PSD_EMAIL_PROVIDER: str = "http"  # smtp | http — http lebih andal di Docker
    PSD_EMAIL_SENDER: str = ""
    RESEND_API_KEY: str = ""
    PSD_EMAIL_SMTP_HOST: str = "smtp.resend.com"
    PSD_EMAIL_SMTP_PORT: int = 587
    PSD_EMAIL_SMTP_USER: str = "resend"
    PSD_EMAIL_SMTP_TLS: bool = True
    PSD_EMAIL_SMTP_SSL: bool = False  # true atau port 465/2465 → SMTP_SSL (implicit TLS)
    PSD_EMAIL_UNSUBSCRIBE_SECRET: str = ""
    PSD_EMAIL_REDIS: bool = True
    PSD_EMAIL_DIGEST_HOUR: int = 8  # WIB, via Celery beat

    @field_validator(
        "RESEND_API_KEY",
        "PSD_EMAIL_SENDER",
        "PSD_EMAIL_PROVIDER",
        "PSD_EMAIL_SMTP_HOST",
        "PSD_EMAIL_SMTP_USER",
        mode="before",
    )
    @classmethod
    def _strip_email_env(cls, value):
        if isinstance(value, str):
            return value.strip().strip('"').strip("'")
        return value

    @field_validator(
        "PSD_EMAIL_ENABLED",
        "PSD_EMAIL_SMTP_TLS",
        "PSD_EMAIL_SMTP_SSL",
        "PSD_EMAIL_REDIS",
        "DEV_EMAIL_ECHO",
        mode="before",
    )
    @classmethod
    def _parse_bool_env(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            v = value.strip().lower()
            if v in {"1", "true", "yes", "on"}:
                return True
            if v in {"0", "false", "no", "off", ""}:
                return False
        return value

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value):
        if isinstance(value, str):
            raw = value.strip()
            if raw.startswith("["):
                return json.loads(raw)
            if raw:
                return [raw]
        return value

    @model_validator(mode="after")
    def _ensure_app_cors_origins(self):
        origins = list(self.BACKEND_CORS_ORIGINS)
        base = self.APP_BASE_URL.rstrip("/")
        if base and base not in origins:
            origins.append(base)
        if base.startswith("https://"):
            www = base.replace("https://", "https://www.", 1)
            if www not in origins:
                origins.append(www)
        elif base.startswith("http://"):
            www = base.replace("http://", "http://www.", 1)
            if www not in origins:
                origins.append(www)
        self.BACKEND_CORS_ORIGINS = origins
        return self

    @model_validator(mode="after")
    def _default_email_sender(self):
        if not (self.PSD_EMAIL_SENDER or "").strip():
            from urllib.parse import urlparse

            host = urlparse(self.APP_BASE_URL or "").hostname or ""
            host = host.removeprefix("www.")
            if host and host not in {"localhost", "127.0.0.1"}:
                self.PSD_EMAIL_SENDER = f"no-reply@{host}"
        return self

    def cors_allows(self, origin: str | None) -> bool:
        if not origin:
            return False
        if origin in self.BACKEND_CORS_ORIGINS:
            return True
        base = self.APP_BASE_URL.rstrip("/")
        return origin == base or origin == base.replace("://", "://www.", 1)


settings = Settings()
