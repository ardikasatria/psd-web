"""Pengganti BackgroundTasks — enqueue Celery atau fallback dev."""
from __future__ import annotations

from fastapi import BackgroundTasks

from app.core.config import settings
from app.tasks import seams
from app.tasks.tasks import (
    run_drift_job,
    run_pipeline_job,
    run_room_data_job,
    run_spark_pipeline_job,
    run_synthesis_job,
)


def enqueue_synthesis(job_id: str, payload: dict | None = None) -> str:
    payload = payload or {}
    seams.set_job_status(job_id, "queued")
    return run_synthesis_job.apply_async(args=[job_id, payload]).id


def enqueue_room_data(job_id: str, payload: dict) -> str:
    seams.set_job_status(job_id, "queued")
    return run_room_data_job.apply_async(args=[job_id, payload]).id


def enqueue_pipeline(job_id: str, payload: dict, *, queue: str = "pabrik_data") -> str:
    seams.set_job_status(job_id, "queued")
    return run_pipeline_job.apply_async(args=[job_id, payload], queue=queue).id


def enqueue_spark_pipeline(job_id: str, payload: dict) -> str:
    seams.set_job_status(job_id, "queued")
    return run_spark_pipeline_job.apply_async(args=[job_id, payload], queue="spark").id


def submit_synthesis(
    job_id: str,
    bg: BackgroundTasks | None = None,
) -> dict:
    if settings.PSD_USE_CELERY:
        return {"task_id": enqueue_synthesis(job_id)}
    if bg is None:
        raise RuntimeError("BackgroundTasks diperlukan saat Celery nonaktif")
    from app.modules.synthesis.worker import run_synthesis_job as _run

    bg.add_task(_run, job_id)
    return {}


def submit_room_data(
    job_id: str,
    n_rows: int,
    bg: BackgroundTasks | None = None,
) -> dict:
    payload = {"n_rows": n_rows}
    if settings.PSD_USE_CELERY:
        return {"task_id": enqueue_room_data(job_id, payload)}
    if bg is None:
        raise RuntimeError("BackgroundTasks diperlukan saat Celery nonaktif")
    from app.modules.rooms.worker import run_room_data_job as _run

    bg.add_task(_run, job_id, n_rows)
    return {}


def submit_pipeline(
    job_id: str,
    max_rows: int,
    bg: BackgroundTasks | None = None,
    *,
    engine: str = "duckdb",
    queue: str = "pabrik_data",
) -> dict:
    payload = {"max_rows": max_rows, "engine": engine}
    if settings.PSD_USE_CELERY:
        if engine == "spark":
            return {"task_id": enqueue_spark_pipeline(job_id, payload), "engine": engine, "queue": queue}
        return {"task_id": enqueue_pipeline(job_id, payload, queue=queue), "engine": engine, "queue": queue}
    if bg is None:
        raise RuntimeError("BackgroundTasks diperlukan saat Celery nonaktif")
    if engine == "spark":
        from app.engine.spark_worker import run_spark_pipeline_job as _spark

        bg.add_task(_spark, job_id, max_rows)
    else:
        from app.modules.factory.worker import run_pipeline_job as _run

        bg.add_task(_run, job_id, max_rows)
    return {"engine": engine, "queue": queue}


def enqueue_drift(report_id: str, payload: dict) -> str:
    seams.set_job_status(report_id, "queued")
    return run_drift_job.apply_async(args=[report_id, payload], queue="pabrik_data").id


def submit_drift(
    report_id: str,
    bg: BackgroundTasks | None = None,
    *,
    current_source_id: str | None = None,
    submission_id: str | None = None,
    model_version: str | None = None,
) -> dict:
    payload = {
        "current_source_id": current_source_id,
        "submission_id": submission_id,
        "model_version": model_version,
    }
    if settings.PSD_USE_CELERY:
        return {"task_id": enqueue_drift(report_id, payload)}
    if bg is None:
        raise RuntimeError("BackgroundTasks diperlukan saat Celery nonaktif")
    from app.mlops.worker import run_drift_job as _run

    async def _wrapper():
        await _run(
            report_id,
            current_source_id=current_source_id,
            submission_id=submission_id,
            model_version=model_version,
        )

    bg.add_task(lambda: __import__("asyncio").run(_wrapper()))
    return {}
