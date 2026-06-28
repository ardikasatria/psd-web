import threading
import time

from sqlalchemy import select

from app.core.config import settings
from app.core.db import async_session
from app.modules.factory.engine import _connect, _resolve_source, _topo, run_dag
from app.modules.factory.models import Pipeline, PipelineRun
from app.tasks.seams import PermanentError, RetryableError, is_retryable


async def run_pipeline_job(run_id: str, max_rows: int):
    async with async_session() as db:
        run = (await db.execute(select(PipelineRun).where(PipelineRun.id == run_id))).scalar_one()
        pl = (await db.execute(select(Pipeline).where(Pipeline.id == run.pipeline_id))).scalar_one()
        run.status = "running"
        run.execution_engine = "duckdb"
        await db.commit()
        spec = pl.spec_json or {"nodes": [], "edges": []}
        nodes_by_id = {n["id"]: n for n in spec["nodes"]}
        order, preds = _topo(spec["nodes"], spec["edges"])
        source_map = {}
        for n in spec["nodes"]:
            if n["type"] == "source":
                sid = (n.get("params") or {}).get("source_id")
                reader, fmt, synthetic = await _resolve_source(db, sid)
                source_map[n["id"]] = (reader, fmt, synthetic)
        con = _connect()
        timer = threading.Timer(settings.FACTORY_RUN_TIMEOUT_S, con.interrupt)
        t0 = time.time()
        try:
            timer.start()
            layers, lineage, rows_out = run_dag(con, nodes_by_id, order, preds, source_map, max_rows, run_id)
            run.status = "done"
            run.layers_json = layers
            run.lineage_json = lineage
            run.rows_out = rows_out
        except (RetryableError, PermanentError):
            raise
        except Exception as e:
            if is_retryable(e):
                run.duration_ms = int((time.time() - t0) * 1000)
                await db.commit()
                raise RetryableError(str(e)) from e
            run.status = "error"
            run.error = str(e)[:500]
        finally:
            timer.cancel()
            con.close()
            run.duration_ms = int((time.time() - t0) * 1000)
            await db.commit()
            if run.status == "done":
                await _invalidate_previous_run_cache(db, pl.id, run.id)
            if run.status == "error" and run.error:
                raise PermanentError(run.error)


async def _invalidate_previous_run_cache(db, pipeline_id: str, current_run_id: str) -> None:
    from app.perf.deps import get_cache
    from app.perf import targets as perf_targets

    cache = get_cache()
    if not cache:
        return
    prev = (
        await db.execute(
            select(PipelineRun.id)
            .where(
                PipelineRun.pipeline_id == pipeline_id,
                PipelineRun.status == "done",
                PipelineRun.id != current_run_id,
            )
            .order_by(PipelineRun.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    if prev:
        perf_targets.invalidate_run(cache, prev)
