"""Singleton cache & registri latensi (Langkah 58)."""
from __future__ import annotations

from app.core.config import settings
from app.perf.cache import Cache
from app.perf.measure import Registry
from app.perf.store import InMemoryTTLStore, RedisTTLStore

_registry = Registry()
_cache: Cache | None = None


def get_registry() -> Registry:
    return _registry


def get_cache() -> Cache | None:
    global _cache
    if not settings.PSD_PERF_CACHE_ENABLED:
        return None
    if _cache is None:
        if settings.PSD_PERF_REDIS:
            import redis

            client = redis.from_url(settings.REDIS_URL, decode_responses=True)
            store = RedisTTLStore(client)
        else:
            store = InMemoryTTLStore()
        _cache = Cache(store, namespace="psd:perf")
    return _cache


def use_cache(metric_name: str) -> bool:
    if not settings.PSD_PERF_CACHE_ENABLED:
        return False
    if not settings.PSD_PERF_CACHE_AUTO:
        return True
    return get_registry().should_cache(
        metric_name,
        threshold_ms=settings.PSD_PERF_SLOW_THRESHOLD_MS,
        min_samples=settings.PSD_PERF_MIN_SAMPLES,
    )
