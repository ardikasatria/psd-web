"""Dispatch eksekusi pipeline — pemilih engine + antrian Celery (Langkah 54)."""
from __future__ import annotations

from .selector import choose_engine
from .spec import Pipeline

ENGINE_QUEUE = {"duckdb": "pabrik_data", "spark": "spark"}


def plan_execution(pipeline: Pipeline, *, est_bytes: int | None = None) -> dict:
    engine = choose_engine(pipeline, est_bytes=est_bytes)
    return {
        "pipeline_id": pipeline.id,
        "engine": engine,
        "queue": ENGINE_QUEUE[engine],
        "est_bytes": est_bytes,
    }
