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

    TOS_VERSION: str = "2026-06"

    OPENAI_API_KEY: str = ""
    AI_MODEL: str = "gpt-4o-mini"

    FACTORY_RUN_TIMEOUT_S: int = 90

    # Celery (opsional — prod; dev memakai BackgroundTasks)
    CELERY_BROKER_URL: str = ""
    CELERY_RESULT_BACKEND: str = ""


settings = Settings()
