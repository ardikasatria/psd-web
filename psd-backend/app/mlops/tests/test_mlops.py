"""
Uji base MLOps (Langkah 55) — murni Python, tanpa MLflow hidup.
"""
import random

import pytest

from app.mlops import drift, drift_job, monitoring, seams
from app.mlops.registry import RegistryService


def test_psi_identical_is_stable():
    random.seed(1)
    ref = [random.gauss(0, 1) for _ in range(2000)]
    cur = [random.gauss(0, 1) for _ in range(2000)]
    psi = drift.psi_numeric(ref, cur)
    assert psi < 0.1
    assert drift.classify_psi(psi) == "stable"


def test_psi_shifted_is_significant():
    random.seed(2)
    ref = [random.gauss(0, 1) for _ in range(2000)]
    cur = [random.gauss(3, 1) for _ in range(2000)]
    psi = drift.psi_numeric(ref, cur)
    assert psi > 0.25
    assert drift.classify_psi(psi) == "significant"


def test_psi_categorical_shift():
    ref = ["a"] * 800 + ["b"] * 200
    cur = ["a"] * 200 + ["b"] * 800
    assert drift.psi_categorical(ref, cur) > 0.25


def test_ks_identical_zero_and_shift_positive():
    data = list(range(100))
    assert drift.ks_statistic(data, data) == 0.0
    assert drift.ks_statistic(data, [x + 100 for x in data]) == 1.0


def test_classify_thresholds():
    assert drift.classify_psi(0.05) == "stable"
    assert drift.classify_psi(0.15) == "moderate"
    assert drift.classify_psi(0.40) == "significant"


def test_drift_row_shape_and_round():
    r = monitoring.drift_row(
        model_name="m",
        model_version="3",
        feature="x",
        metric="psi",
        value=0.123456789,
        status="moderate",
    )
    assert r["model_name"] == "m" and r["model_version"] == "3"
    assert r["metric"] == "psi" and r["status"] == "moderate"
    assert r["value"] == 0.123457
    assert "computed_at" in r


def test_collect_alerts():
    rows = [
        monitoring.drift_row(
            model_name="m", model_version="1", feature="x", metric="psi", value=0.4, status="significant"
        ),
        monitoring.drift_row(
            model_name="m", model_version="1", feature="y", metric="psi", value=0.05, status="stable"
        ),
    ]
    alerts = monitoring.collect_alerts(rows)
    assert len(alerts) == 1 and alerts[0]["feature"] == "x"


class FakeMV:
    def __init__(self, version):
        self.version = version


class FakeMlflow:
    def __init__(self):
        self.calls = []

    def create_registered_model(self, name):
        self.calls.append(("create_model", name))

    def create_model_version(self, name, source, run_id):
        self.calls.append(("create_version", name, source, run_id))
        return FakeMV("4")

    def set_model_version_tag(self, name, version, k, v):
        self.calls.append(("tag", name, version, k, v))

    def transition_model_version_stage(self, name, version, stage, archive_existing_versions):
        self.calls.append(("transition", name, version, stage, archive_existing_versions))


def test_registry_register_and_promote():
    fake = FakeMlflow()
    svc = RegistryService(fake)
    version = svc.register_from_run(name="psd/iris-clf", run_id="run123", tags={"sumber": "kompetisi"})
    assert version == "4"
    svc.promote(name="psd/iris-clf", version=version, stage="Production")
    kinds = [c[0] for c in fake.calls]
    assert kinds == ["create_model", "create_version", "tag", "transition"]
    cv = next(c for c in fake.calls if c[0] == "create_version")
    assert cv[2] == "runs:/run123/model"


def test_registry_idempotent_when_model_exists():
    class Existing(FakeMlflow):
        def create_registered_model(self, name):
            raise RuntimeError("RESOURCE_ALREADY_EXISTS")

    fake = Existing()
    svc = RegistryService(fake)
    v = svc.register_from_run(name="psd/iris", run_id="r1")
    assert v == "4"


def test_compute_drift_job(monkeypatch):
    random.seed(3)
    ref_num = [random.gauss(0, 1) for _ in range(1000)]
    cur_num = [random.gauss(3, 1) for _ in range(1000)]

    def load_ref(m, v, f):
        return ref_num if f == "umur" else ["a"] * 900 + ["b"] * 100

    def load_cur(m, v, f):
        return cur_num if f == "umur" else ["a"] * 100 + ["b"] * 900

    monkeypatch.setattr(seams, "load_reference", load_ref)
    monkeypatch.setattr(seams, "load_current", load_cur)

    written, alerts = [], []
    result = drift_job.compute_drift(
        "psd/iris",
        "4",
        features=[{"name": "umur", "kind": "numeric"}, {"name": "wilayah", "kind": "categorical"}],
        write=lambda rows: written.extend(rows),
        alert=lambda a: alerts.append(a),
    )
    assert len(written) == 3
    metrics = {(r["feature"], r["metric"]) for r in written}
    assert ("umur", "psi") in metrics and ("umur", "ks") in metrics
    assert ("wilayah", "psi") in metrics
    assert len(result["alerts"]) == 2
    assert len(alerts) == 2
