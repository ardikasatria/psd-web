"""Dependency SupersetClient (akun layanan)."""
from __future__ import annotations

from typing import AsyncIterator

from fastapi import HTTPException

from app.core.config import settings
from app.superset.client import SupersetClient


async def get_superset_client() -> AsyncIterator[SupersetClient]:
    if not settings.PSD_SUPERSET_ENABLED:
        raise HTTPException(status_code=503, detail="Superset tidak aktif.")
    if not settings.PSD_SUPERSET_SERVICE_PASSWORD:
        raise HTTPException(status_code=503, detail="Kredensial layanan Superset belum dikonfigurasi.")

    client = SupersetClient(
        settings.PSD_SUPERSET_API_URL,
        settings.PSD_SUPERSET_SERVICE_USER,
        settings.PSD_SUPERSET_SERVICE_PASSWORD,
        provider=settings.PSD_SUPERSET_AUTH_PROVIDER,
    )
    try:
        yield client
    finally:
        await client.aclose()
