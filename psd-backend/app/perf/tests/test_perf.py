"""Uji cache & performa (Langkah 58)."""
from app.perf import targets
from app.perf.cache import Cache
from app.perf.measure import Registry, Stopwatch
from app.perf.store import InMemoryTTLStore


def make_cache(clock=None):
    store = InMemoryTTLStore(clock=clock) if clock else InMemoryTTLStore()
    return Cache(store), store


def test_get_or_set_computes_once_then_hits():
    cache, _ = make_cache()
    calls = []
    out1, from_cache1 = cache.get_or_set("k", lambda: calls.append(1) or {"v": 42})
    out2, from_cache2 = cache.get_or_set("k", lambda: calls.append(1) or {"v": 99})
    assert out1 == {"v": 42} and from_cache1 is False
    assert out2 == {"v": 42} and from_cache2 is True
    assert len(calls) == 1


def test_ttl_expiry_recomputes():
    t = [0.0]
    cache, _ = make_cache(clock=lambda: t[0])
    cache.get_or_set("k", lambda: {"v": 1}, ttl=10)
    t[0] = 11
    out, from_cache = cache.get_or_set("k", lambda: {"v": 2}, ttl=10)
    assert out == {"v": 2} and from_cache is False


def test_delete_invalidates():
    cache, _ = make_cache()
    cache.get_or_set("k", lambda: {"v": 1})
    cache.delete("k")
    out, from_cache = cache.get_or_set("k", lambda: {"v": 2})
    assert out == {"v": 2} and from_cache is False


def test_cached_widget_and_invalidate_run():
    cache, _ = make_cache()
    calls = []

    def compute():
        calls.append(1)
        return {"chart": "bar"}

    targets.cached_widget(cache, "run1", "w1", compute)
    targets.cached_widget(cache, "run1", "w2", compute)
    targets.cached_widget(cache, "run1", "w1", compute)
    assert len(calls) == 2

    removed = targets.invalidate_run(cache, "run1")
    assert removed == 2
    targets.cached_widget(cache, "run1", "w1", compute)
    assert len(calls) == 3


def test_cached_schema_and_invalidate():
    cache, _ = make_cache()
    calls = []
    targets.cached_schema(cache, "gold.fakta", lambda: calls.append(1) or {"cols": 5})
    targets.cached_schema(cache, "gold.fakta", lambda: calls.append(1) or {"cols": 9})
    assert len(calls) == 1
    targets.invalidate_schema(cache, "gold.fakta")
    targets.cached_schema(cache, "gold.fakta", lambda: calls.append(1) or {"cols": 9})
    assert len(calls) == 2


def test_registry_stats_and_is_slow():
    reg = Registry()
    for ms in [10, 20, 30, 40, 1000]:
        reg.record("query.x", ms)
    s = reg.stats("query.x")
    assert s["count"] == 5 and s["max"] == 1000
    assert reg.is_slow("query.x", 100, pct="p95") is True
    assert reg.is_slow("query.x", 100, pct="p50") is False


def test_should_cache_requires_evidence():
    reg = Registry()
    for _ in range(5):
        reg.record("w", 500)
    assert reg.should_cache("w", threshold_ms=200, min_samples=30) is False
    for _ in range(40):
        reg.record("w", 500)
    assert reg.should_cache("w", threshold_ms=200, min_samples=30) is True
    reg2 = Registry()
    for _ in range(40):
        reg2.record("fast", 5)
    assert reg2.should_cache("fast", threshold_ms=200, min_samples=30) is False


def test_stopwatch_records():
    reg = Registry()
    ticks = iter([0.0, 0.025])
    with Stopwatch(reg, "block", clock=lambda: next(ticks)):
        pass
    assert reg.stats("block")["count"] == 1
    assert abs(reg.stats("block")["p50"] - 25.0) < 1e-6
