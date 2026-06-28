"""Integrasi cache ke widget & skema factory (Langkah 58)."""
from __future__ import annotations

import json

from app.core.config import settings
from app.modules.factory.analytics import widget_data
from app.perf.deps import get_cache, get_registry, use_cache
from app.perf.measure import Stopwatch
from app.perf import keys, targets


def fetch_widget_payload(run_id: str, widget_id: str, uri: str, kind: str, qjson: dict) -> dict:
    metric = f"widget.{kind}"

    def compute():
        return widget_data(uri, kind, qjson)

    if not settings.PSD_PERF_ENABLED:
        return compute()

    registry = get_registry()
    with Stopwatch(registry, metric):
        if use_cache(metric):
            cache = get_cache()
            if cache:
                payload, from_cache = targets.cached_widget(cache, run_id, widget_id, compute)
                return {**payload, "_perf": {"from_cache": from_cache}}
        return compute()


async def fetch_schema_payload(source_id: str, compute_fn) -> tuple[dict, bool]:
    metric = "schema.introspect"

    async def run():
        return await compute_fn()

    if not settings.PSD_PERF_ENABLED:
        return await run(), False

    registry = get_registry()
    with Stopwatch(registry, metric):
        if use_cache(metric):
            cache = get_cache()
            if cache:
                full = cache._k(keys.schema_key(source_id))
                raw = cache.store.get(full)
                if raw is not None:
                    return json.loads(raw), True
        result = await run()
        if use_cache(metric):
            cache = get_cache()
            if cache:
                cache.store.set(cache._k(keys.schema_key(source_id)), json.dumps(result), targets.SCHEMA_TTL)
        return result, False
