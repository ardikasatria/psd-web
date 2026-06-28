"""
Dispatch eksekusi pipeline (Langkah 54) — menyatukan pemilih engine + Celery (Langkah 49).

DuckDB → antrian 'pabrik_data' (job ringan, Langkah 49).
Spark   → antrian 'spark' (worker khusus, sumber daya besar).
"""
from __future__ import annotations

from .selector import choose_engine
from .spec import Pipeline

ENGINE_QUEUE = {"duckdb": "pabrik_data", "spark": "spark"}


def plan_execution(pipeline: Pipeline, *, est_bytes: int | None = None) -> dict:
    """Tentukan engine & antrian; kembalikan rencana dispatch (belum enqueue)."""
    engine = choose_engine(pipeline, est_bytes=est_bytes)
    return {
        "pipeline_id": pipeline.id,
        "engine": engine,
        "queue": ENGINE_QUEUE[engine],
        "est_bytes": est_bytes,
    }


# Contoh enqueue (sambungkan ke task Celery Langkah 49):
#   plan = plan_execution(pipeline, est_bytes=size)
#   if plan["engine"] == "spark":
#       run_spark_pipeline.apply_async(args=[pipeline.id], queue=plan["queue"])
#   else:
#       run_pipeline_job.apply_async(args=[pipeline.id, payload], queue=plan["queue"])
