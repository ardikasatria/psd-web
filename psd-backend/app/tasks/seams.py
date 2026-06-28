"""Klasifikasi error & seam integrasi job Celery ke worker PSD asli."""
from __future__ import annotations

import asyncio
import inspect
from typing import Any

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

_sync_engine = None
_SessionLocal: sessionmaker[Session] | None = None


class RetryableError(Exception):
    """Galat sementara — di-retry dengan backoff."""


class PermanentError(Exception):
    """Galat permanen — tidak di-retry."""


def run_maybe_async(fn, *args, **kwargs):
    if inspect.iscoroutinefunction(fn):
        return asyncio.run(fn(*args, **kwargs))
    return fn(*args, **kwargs)


def is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, RetryableError):
        return True
    if isinstance(exc, (TimeoutError, ConnectionError, OSError)):
        return True
    try:
        import openai

        if isinstance(exc, openai.RateLimitError):
            return True
        if isinstance(exc, openai.APIConnectionError | openai.APITimeoutError):
            return True
        if isinstance(exc, openai.APIStatusError) and exc.status_code in (
            429,
            500,
            502,
            503,
            504,
        ):
            return True
    except ImportError:
        pass
    return False


def _worker_session() -> Session:
    global _sync_engine, _SessionLocal
    if _SessionLocal is None:
        sync_url = settings.DATABASE_URL.replace("+asyncpg", "+psycopg2")
        _sync_engine = create_engine(sync_url, pool_pre_ping=True)
        _SessionLocal = sessionmaker(bind=_sync_engine, expire_on_commit=False)
    return _SessionLocal()


def _job_kind(job_id: str) -> str:
    if job_id.startswith("syn_"):
        return "synthesis"
    if job_id.startswith("run_"):
        return "pipeline"
    if job_id.startswith("room_"):
        return "room_data"
    raise ValueError(f"job_id tidak dikenal: {job_id}")


def set_job_status(job_id: str, status: str, **extra: Any) -> None:
    """Tulis status ke tabel domain PSD agar UI polling tetap jalan."""
    from app.modules.factory.models import PipelineRun
    from app.modules.rooms.models import IdeaRoom
    from app.modules.synthesis.models import SynthesisJob

    kind = _job_kind(job_id)
    err = extra.get("error")

    with _worker_session() as db:
        if kind == "synthesis":
            row = db.get(SynthesisJob, job_id)
            if not row:
                return
            if status == "queued":
                row.status = "queued"
            elif status in ("started", "retrying"):
                row.status = "planning" if not row.spec else "generating"
                if err and status == "retrying":
                    row.error = str(err)[:500]
            elif status == "success":
                if row.status not in ("done", "failed"):
                    row.status = "done"
            elif status == "failure":
                row.status = "failed"
                if err:
                    row.error = str(err)[:500]
        elif kind == "room_data":
            row = db.get(IdeaRoom, job_id)
            if not row:
                return
            if status in ("queued", "started", "retrying"):
                row.status = "generating"
                if err and status == "retrying":
                    row.generation_error = str(err)[:500]
            elif status == "failure":
                row.status = "closed"
                row.generation_error = (err or "Job gagal")[:500]
        elif kind == "pipeline":
            row = db.get(PipelineRun, job_id)
            if not row:
                return
            if status in ("queued", "started", "retrying"):
                row.status = "running"
                if err and status == "retrying":
                    row.error = str(err)[:500]
            elif status == "failure":
                row.status = "error"
                if err:
                    row.error = str(err)[:500]
        db.commit()


def synthesis_impl(job_id: str, payload: dict) -> dict:
    from app.modules.synthesis.worker import run_synthesis_job

    try:
        run_maybe_async(run_synthesis_job, job_id)
    except (RetryableError, PermanentError):
        raise
    except Exception as e:
        if is_retryable(e):
            raise RetryableError(str(e)) from e
        raise PermanentError(str(e)) from e
    return {"job_id": job_id, "ok": True}


def room_data_impl(job_id: str, payload: dict) -> dict:
    from app.modules.rooms.worker import run_room_data_job

    n_rows = int(payload.get("n_rows", 1000))
    try:
        run_maybe_async(run_room_data_job, job_id, n_rows)
    except (RetryableError, PermanentError):
        raise
    except Exception as e:
        if is_retryable(e):
            raise RetryableError(str(e)) from e
        raise PermanentError(str(e)) from e
    return {"job_id": job_id, "ok": True}


def pipeline_impl(job_id: str, payload: dict) -> dict:
    engine = payload.get("engine", "duckdb")
    max_rows = int(payload.get("max_rows", 1000))
    try:
        if engine == "spark":
            from app.engine.spark_worker import run_spark_pipeline_job

            run_maybe_async(run_spark_pipeline_job, job_id, max_rows)
        else:
            from app.modules.factory.worker import run_pipeline_job

            run_maybe_async(run_pipeline_job, job_id, max_rows)
    except (RetryableError, PermanentError):
        raise
    except Exception as e:
        if is_retryable(e):
            raise RetryableError(str(e)) from e
        raise PermanentError(str(e)) from e
    return {"job_id": job_id, "ok": True}


def drift_impl(report_id: str, payload: dict) -> dict:
    try:
        from app.mlops.worker import run_drift_job

        run_maybe_async(
            run_drift_job,
            report_id,
            current_source_id=payload.get("current_source_id"),
            submission_id=payload.get("submission_id"),
            model_version=payload.get("model_version"),
        )
    except (RetryableError, PermanentError):
        raise
    except Exception as e:
        if is_retryable(e):
            raise RetryableError(str(e)) from e
        raise PermanentError(str(e)) from e
    return {"report_id": report_id, "ok": True}
