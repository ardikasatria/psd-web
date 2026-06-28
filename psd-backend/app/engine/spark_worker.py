"""Worker Spark pipeline (Langkah 54)."""
from __future__ import annotations

import time

from sqlalchemy import select

from app.core.config import settings
from app.core.db import async_session
from app.engine.adaptor import from_psd_pipeline
from app.engine.spark_executor import SparkExecutor
from app.engine.spark_io import make_spark_io
from app.engine.spark_plan import build_plan
from app.modules.factory.engine import _resolve_source
from app.modules.factory.models import Pipeline, PipelineRun
from app.tasks.seams import PermanentError, RetryableError, is_retryable


async def run_spark_pipeline_job(run_id: str, max_rows: int):
    if not settings.PSD_SPARK_ENABLED:
        raise PermanentError("Spark tidak aktif (PSD_SPARK_ENABLED=false).")

    try:
        from pyspark.sql import SparkSession
    except ImportError as e:
        raise PermanentError("PySpark belum terpasang di worker Spark.") from e

    async with async_session() as db:
        run = (await db.execute(select(PipelineRun).where(PipelineRun.id == run_id))).scalar_one()
        pl = (await db.execute(select(Pipeline).where(Pipeline.id == run.pipeline_id))).scalar_one()
        run.status = "running"
        run.execution_engine = "spark"
        await db.commit()

        ep = from_psd_pipeline(pl)
        plan = build_plan(ep)
        t0 = time.time()

        for step in plan:
            if step.op != "read":
                continue
            sid = step.params.get("source_id")
            if not sid:
                continue
            reader, fmt, _ = await _resolve_source(db, sid)
            for prefix, suffix in (("read_parquet('", "')"), ("read_csv_auto('", "')")):
                if reader.startswith(prefix) and reader.endswith(suffix):
                    step.params["uri"] = reader[len(prefix) : -len(suffix)]
                    break
            step.params["format"] = fmt

        read_fn, write_fn = make_spark_io(None)
        session = (
            SparkSession.builder.appName(f"psd-{run_id}")
            .master(settings.PSD_SPARK_MASTER)
            .getOrCreate()
        )
        try:
            outputs = SparkExecutor(session, read_fn=read_fn, write_fn=write_fn).run(plan)
            run.status = "done"
            run.layers_json = {
                "gold": [{"node": o.split(".")[-1], "uri": o, "rows": 0} for o in outputs]
            }
            run.lineage_json = {"engine": "spark", "outputs": outputs, "max_rows": max_rows}
            run.rows_out = 0
        except Exception as e:
            if is_retryable(e):
                run.duration_ms = int((time.time() - t0) * 1000)
                await db.commit()
                raise RetryableError(str(e)) from e
            run.status = "error"
            run.error = str(e)[:500]
            raise PermanentError(run.error) from e
        finally:
            session.stop()
            run.duration_ms = int((time.time() - t0) * 1000)
            await db.commit()
