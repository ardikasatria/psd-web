"""Uji task Celery dalam mode EAGER (Langkah 49)."""
import pytest

from app.tasks import seams
from app.tasks.base import PSDTask
from app.tasks.celery_app import celery_app
from app.tasks.tasks import run_pipeline_job, run_room_data_job, run_synthesis_job


@pytest.fixture(autouse=True)
def eager_mode():
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
    yield


@pytest.fixture
def status_log(monkeypatch):
    calls = []
    monkeypatch.setattr(
        seams,
        "set_job_status",
        lambda job_id, status, **e: calls.append((job_id, status)),
    )
    return calls


def _route(name):
    q = celery_app.amqp.router.route({}, name)["queue"]
    return getattr(q, "name", q)


def test_queue_routing():
    assert _route("psd.synthesis.run") == "ai"
    assert _route("psd.room_data.run") == "pabrik_data"
    assert _route("psd.pipeline.run") == "pabrik_data"


def test_reliability_config():
    c = celery_app.conf
    assert c.task_acks_late is True
    assert c.worker_prefetch_multiplier == 1
    assert c.task_serializer == "json"
    assert "pickle" not in (c.accept_content or [])


def test_synthesis_success(status_log, monkeypatch):
    seen = {}
    monkeypatch.setattr(
        seams,
        "synthesis_impl",
        lambda job_id, payload: seen.update(payload) or {"rows": 10},
    )
    res = run_synthesis_job.apply_async(args=["syn_test1", {"n": 5}]).get()
    assert res == {"rows": 10}
    assert seen == {"n": 5}
    statuses = [s for (_, s) in status_log]
    assert "started" in statuses and "success" in statuses


def test_retry_path_wired(status_log, monkeypatch):
    from celery.exceptions import Retry

    assert seams.RetryableError in PSDTask.autoretry_for
    assert seams.PermanentError not in PSDTask.autoretry_for
    assert PSDTask.max_retries == 5 and PSDTask.retry_backoff is True

    monkeypatch.setattr(
        seams,
        "synthesis_impl",
        lambda j, p: (_ for _ in ()).throw(seams.RetryableError("x")),
    )
    with pytest.raises(Retry):
        run_synthesis_job.apply(args=["syn_test2", {}]).get()
    assert ("syn_test2", "retrying") in status_log


def test_permanent_not_retried(status_log, monkeypatch):
    attempts = {"n": 0}

    def bad(job_id, payload):
        attempts["n"] += 1
        raise seams.PermanentError("kuota habis")

    monkeypatch.setattr(seams, "pipeline_impl", bad)
    with pytest.raises(seams.PermanentError):
        run_pipeline_job.apply(args=["run_test3", {}], throw=True).get()
    assert attempts["n"] == 1
    assert ("run_test3", "retrying") not in status_log

    run_pipeline_job.on_failure(
        seams.PermanentError("kuota habis"), "tid", ["run_test3", {}], {}, None
    )
    assert ("run_test3", "failure") in status_log


def test_room_data_runs(status_log, monkeypatch):
    monkeypatch.setattr(seams, "room_data_impl", lambda job_id, payload: {"done": job_id})
    res = run_room_data_job.apply_async(args=["room_test4", {}]).get()
    assert res == {"done": "room_test4"}
