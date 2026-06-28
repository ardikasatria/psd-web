"""Konfigurasi integrasi Superset (Langkah 53)."""
import os


class Settings:
    # URL API internal (server-ke-server) & URL publik (untuk Embedded SDK di browser).
    API_URL = os.environ.get("PSD_SUPERSET_API_URL", "http://superset:8088").rstrip("/")
    PUBLIC_URL = os.environ.get("PSD_SUPERSET_PUBLIC_URL", "http://localhost:8088").rstrip("/")

    # Akun layanan Superset (admin) untuk provisioning & mint guest token.
    SERVICE_USERNAME = os.environ.get("PSD_SUPERSET_SERVICE_USER", "psd_service")
    SERVICE_PASSWORD = os.environ.get("PSD_SUPERSET_SERVICE_PASSWORD", "")
    SERVICE_PROVIDER = os.environ.get("PSD_SUPERSET_AUTH_PROVIDER", "db")

    # Koneksi database skema gold (dibuat sekali; id-nya dipakai saat provision dataset).
    GOLD_DATABASE_ID = int(os.environ.get("PSD_SUPERSET_GOLD_DB_ID", "1"))
    GOLD_SCHEMA = os.environ.get("PSD_SUPERSET_GOLD_SCHEMA", "gold")

    # Domain yang diizinkan meng-embed (untuk enable_embedded).
    ALLOWED_EMBED_DOMAINS = [
        d for d in os.environ.get("PSD_SUPERSET_EMBED_DOMAINS", "localhost").split(",") if d
    ]


settings = Settings()
