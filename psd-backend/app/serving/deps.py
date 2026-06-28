"""Dependency & singleton serving (Langkah 56)."""
from __future__ import annotations

from sqlalchemy import select

from app.core.config import settings
from app.core.db import async_session
from app.mlops.models import ModelRegistry, ModelVersion
from app.serving.loader import ModelLoader
from app.serving.monitoring_hook import latency_row
from app.serving.quota import InMemoryWindowStore, RedisWindowStore
from app.serving import seams
from app.serving.service import InferenceService

_loader: ModelLoader | None = None
_service: InferenceService | None = None
_store = None


def get_loader() -> ModelLoader:
    global _loader
    if _loader is None:
        _loader = ModelLoader(seams.load_model)
    return _loader


def invalidate_model_cache(name: str, stage: str | None = None) -> None:
    get_loader().invalidate(name, stage)


def _latency_log_fn(*, model_name, stage, latency_ms, n):
    del n
    version = seams.version_lookup(model_name, stage)
    seams.write_monitoring_rows(
        [latency_row(model_name=model_name, model_version=version, latency_ms=latency_ms)],
        model_name=model_name,
    )


def get_inference_service() -> InferenceService:
    global _service
    if _service is None:
        _service = InferenceService(get_loader(), log_fn=_latency_log_fn)
    return _service


def get_quota_store():
    global _store
    if _store is not None:
        return _store
    if settings.PSD_SERVING_REDIS_QUOTA:
        import redis

        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        _store = RedisWindowStore(client)
    else:
        _store = InMemoryWindowStore()
    return _store


async def resolve_mlflow_name(name: str) -> str:
    """Terima slug registry atau mlflow_name langsung."""
    async with async_session() as db:
        reg = (
            await db.execute(select(ModelRegistry).where(ModelRegistry.slug == name))
        ).scalar_one_or_none()
        if not reg:
            reg = (
                await db.execute(select(ModelRegistry).where(ModelRegistry.mlflow_name == name))
            ).scalar_one_or_none()
        if reg:
            await _bind_registry_context(db, reg)
            return reg.mlflow_name
        return name


async def _bind_registry_context(db, reg: ModelRegistry) -> None:
    from app.mlops.seams import gold_uri_for_registry

    gold_uri = reg.monitoring_gold_uri or gold_uri_for_registry(reg.slug)
    seams.bind_gold_uri(reg.mlflow_name, gold_uri)
    prod = (
        await db.execute(
            select(ModelVersion)
            .where(ModelVersion.registry_id == reg.id, ModelVersion.stage == "Production")
            .order_by(ModelVersion.version.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if prod and prod.mlflow_model_version:
        seams.set_production_version(reg.mlflow_name, prod.mlflow_model_version)
        return
    latest = (
        await db.execute(
            select(ModelVersion)
            .where(ModelVersion.registry_id == reg.id)
            .order_by(ModelVersion.version.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if latest and latest.mlflow_model_version:
        seams.set_production_version(reg.mlflow_name, latest.mlflow_model_version)
