"""Dependency MLflow client (Langkah 55)."""
from collections.abc import AsyncGenerator

from app.core.config import settings
from app.mlops.client import MlflowClient


async def get_mlflow_client() -> AsyncGenerator[MlflowClient, None]:
    client = MlflowClient(settings.PSD_MLFLOW_TRACKING_URI)
    try:
        yield client
    finally:
        await client.aclose()
