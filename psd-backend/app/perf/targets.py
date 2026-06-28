"""Cache widget (Langkah 46) & skema (Langkah 47)."""
from __future__ import annotations

from . import keys
from .cache import Cache

WIDGET_TTL = 3600
SCHEMA_TTL = 600


def cached_widget(cache: Cache, run_id: str, widget: str, compute_fn, *, ttl: int = WIDGET_TTL):
    value, from_cache = cache.get_or_set(keys.widget_key(run_id, widget), compute_fn, ttl=ttl)
    return value, from_cache


def invalidate_run(cache: Cache, run_id: str) -> int:
    return cache.delete_prefix(keys.widget_run_prefix(run_id))


def cached_schema(cache: Cache, source: str, compute_fn, *, ttl: int = SCHEMA_TTL):
    value, from_cache = cache.get_or_set(keys.schema_key(source), compute_fn, ttl=ttl)
    return value, from_cache


def invalidate_schema(cache: Cache, source: str) -> None:
    cache.delete(keys.schema_key(source))
