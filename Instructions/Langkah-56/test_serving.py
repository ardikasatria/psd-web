"""
Uji serving (Langkah 56) — murni Python + FastAPI TestClient, tanpa MLflow hidup.
"""
import pytest

from app.serving import scaling
from app.serving.loader import ModelLoader
from app.serving.monitoring_hook import make_latency_logger
from app.serving.quota import (
    InMemoryWindowStore,
    QuotaExceeded,
    check_and_consume,
    limit_for,
)
from app.serving.service import InferenceService


# -------------------- loader --------------------
def test_loader_caches_per_name_stage():
    calls = []

    def load_fn(uri):
        calls.append(uri)
        return object()

    loader = ModelLoader(load_fn)
    a = loader.get("m", "Production")
    b = loader.get("m", "Production")
    assert a is b                      # cache → satu kali load
    assert calls == ["models:/m/Production"]
    loader.get("m", "Staging")
    assert len(calls) == 2
    loader.invalidate("m")
    loader.get("m", "Production")
    assert len(calls) == 3


# -------------------- service + latensi --------------------
def test_service_measures_latency_and_logs():
    class FakeModel:
        def predict(self, x): return [1] * len(x)

    loader = ModelLoader(lambda uri: FakeModel())
    ticks = iter([100.0, 100.05])      # 50 ms
    logs = []
    svc = InferenceService(
        loader, clock=lambda: next(ticks),
        log_fn=lambda **kw: logs.append(kw))
    out = svc.predict("m", [1, 2, 3])
    assert out["prediction"] == [1, 1, 1]
    assert out["latency_ms"] == 50.0
    assert logs[0]["model_name"] == "m" and logs[0]["n"] == 3


# -------------------- kuota per tier --------------------
def test_quota_limits_by_tier():
    assert limit_for("pemula") == 100
    assert limit_for("lanjut") == 2000
    assert limit_for("tak-ada") == 100        # default


def test_quota_exceeded_raises():
    store = InMemoryWindowStore()
    # pemula = 100; konsumsi 100 OK, ke-101 ditolak
    for _ in range(100):
        check_and_consume(store, "u1", "pemula")
    with pytest.raises(QuotaExceeded):
        check_and_consume(store, "u1", "pemula")


def test_quota_window_resets():
    t = [0.0]
    store = InMemoryWindowStore(window_s=60, clock=lambda: t[0])
    for _ in range(100):
        check_and_consume(store, "u", "pemula")
    t[0] = 61                                   # jendela baru
    q = check_and_consume(store, "u", "pemula")
    assert q["used"] == 1


# -------------------- scaling & retrain --------------------
def test_desired_replicas_bounds():
    assert scaling.desired_replicas(rps=0, target_rps_per_replica=10) == 1
    assert scaling.desired_replicas(rps=25, target_rps_per_replica=10) == 3
    assert scaling.desired_replicas(rps=1000, target_rps_per_replica=10,
                                    max_replicas=5) == 5


def test_should_retrain_consecutive():
    assert scaling.should_retrain(["stable", "significant", "significant"]) is False
    assert scaling.should_retrain(
        ["significant", "significant", "significant"]) is True
    assert scaling.should_retrain(
        ["significant", "stable", "significant", "significant"], consecutive=2) is True


# -------------------- monitoring hook --------------------
def test_latency_logger_writes_row():
    rows = []
    log_fn = make_latency_logger(lambda r: rows.extend(r),
                                 version_lookup=lambda n, s: "4")
    log_fn(model_name="m", stage="Production", latency_ms=12.3456, n=1)
    assert rows[0]["metric"] == "latency_ms"
    assert rows[0]["model_version"] == "4"
    assert rows[0]["value"] == 12.346


# -------------------- endpoint --------------------
@pytest.mark.asyncio
async def test_predict_endpoint_quota_and_success(monkeypatch):
    from fastapi import FastAPI
    from httpx import ASGITransport, AsyncClient

    from app.serving import endpoint as ep
    from app.serving import seams

    monkeypatch.setattr(seams, "user_id", lambda u: "u1")
    monkeypatch.setattr(seams, "user_tier", lambda u: "pemula")

    class FakeModel:
        def predict(self, x): return ["ok"]

    svc = InferenceService(ModelLoader(lambda uri: FakeModel()))
    store = InMemoryWindowStore()

    app = FastAPI()
    app.include_router(ep.router)
    app.dependency_overrides[ep.get_current_user] = lambda: {"id": 1}
    app.dependency_overrides[ep.get_service] = lambda: svc
    app.dependency_overrides[ep.get_quota_store] = lambda: store

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://t") as c:
        r = await c.post("/api/models/iris/predict", json={"inputs": [[1, 2]]})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["prediction"] == ["ok"]
        assert body["quota"]["remaining"] == 99

        # habiskan kuota → 429
        for _ in range(99):
            await c.post("/api/models/iris/predict", json={"inputs": [[1, 2]]})
        r = await c.post("/api/models/iris/predict", json={"inputs": [[1, 2]]})
        assert r.status_code == 429
