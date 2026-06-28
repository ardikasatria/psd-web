import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.storage import asset_key_from_uri, presigned_asset_get
from app.modules.categories.util import slugify
from app.engine.adaptor import from_psd_pipeline
from app.engine.airflow_gen import render_dag
from app.engine.dispatch import plan_execution
from app.engine.estimate import estimate_pipeline_bytes
from app.modules.factory.analytics import widget_data  # noqa: F401 — via perf.integration
from app.modules.factory.dashboard_helpers import can_edit_dashboard, get_dashboard_by_slug, latest_done_run, latest_gold_map
from app.modules.factory.engine import _connect, _resolve_source
from app.modules.factory.models import Dashboard, DataSource, Pipeline, PipelineRun, Widget
from app.perf.integration import fetch_schema_payload, fetch_widget_payload
from app.perf.deps import get_cache
from app.perf import targets as perf_targets
from app.modules.factory.quota import quota_for
from app.modules.factory.validate import validate_spec
from app.tasks.dispatch import submit_pipeline
from app.modules.repos.models import Repo
from app.modules.teams.deps import membership
from app.modules.users.models import User

router = APIRouter(tags=["factory"])


async def _can_edit_pipeline(db: AsyncSession, pl: Pipeline, user: User) -> None:
    if pl.owner_id == user.id:
        return
    if pl.team_id and await membership(db, pl.team_id, user.id):
        return
    raise ApiError(403, "forbidden", "Tidak berhak menyunting pipeline")


async def _runs_today(db: AsyncSession, owner_id: str) -> int:
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (
        await db.execute(
            select(func.count())
            .select_from(PipelineRun)
            .join(Pipeline, Pipeline.id == PipelineRun.pipeline_id)
            .where(Pipeline.owner_id == owner_id, PipelineRun.created_at >= start)
        )
    ).scalar_one()


async def _get_pipeline_by_slug(db: AsyncSession, slug: str) -> Pipeline:
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl:
        raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    return pl


@router.get("/me/factory/quota")
async def factory_quota(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    q = quota_for(user)
    return {**q, "runs_used_today": await _runs_today(db, user.id)}


async def _validate_and_set(db: AsyncSession, pl: Pipeline, user: User) -> list[str]:
    q = quota_for(user)
    errors = validate_spec(pl.spec_json or {"nodes": [], "edges": []}, q["max_nodes"])
    for n in (pl.spec_json or {}).get("nodes", []):
        if n.get("type") == "source":
            sid = (n.get("params") or {}).get("source_id")
            if sid and not (
                await db.execute(select(DataSource).where(DataSource.id == sid))
            ).scalar_one_or_none():
                errors.append(f"Sumber tidak ditemukan untuk node '{n.get('id')}'")
    pl.status = "error" if errors else ("valid" if (pl.spec_json or {}).get("nodes") else "draft")
    pl.validation_error = "; ".join(errors) if errors else None
    return errors


@router.post("/data-sources", status_code=201)
async def register_source(
    body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    ds_slug = body.get("dataset_slug")
    repo = (
        await db.execute(select(Repo).where(Repo.slug == ds_slug, Repo.kind == "dataset"))
    ).scalar_one_or_none()
    if not repo:
        raise ApiError(404, "not_found", "Dataset tidak ditemukan")
    src = DataSource(
        owner_id=user.id,
        team_id=repo.team_id,
        name=body.get("name") or repo.name,
        uri=f"psd://dataset/{repo.slug}",
        kind="dataset",
        schema_json=None,
    )
    db.add(src)
    await db.commit()
    return {"id": src.id, "uri": src.uri}


@router.get("/data-sources")
async def list_sources(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(DataSource).where(DataSource.owner_id == user.id).order_by(DataSource.created_at.desc())
        )
    ).scalars().all()
    return {"items": [{"id": s.id, "name": s.name, "uri": s.uri, "kind": s.kind} for s in rows]}


@router.delete("/data-sources/{sid}", status_code=204)
async def delete_source(
    sid: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    s = (await db.execute(select(DataSource).where(DataSource.id == sid))).scalar_one_or_none()
    if s and s.owner_id == user.id:
        cache = get_cache()
        if cache:
            perf_targets.invalidate_schema(cache, sid)
        await db.delete(s)
        await db.commit()


@router.get("/data-sources/{sid}/schema")
async def source_schema(
    sid: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    s = (await db.execute(select(DataSource).where(DataSource.id == sid))).scalar_one_or_none()
    if not s:
        raise ApiError(404, "not_found", "Sumber tidak ditemukan")
    if s.owner_id != user.id:
        raise ApiError(403, "forbidden", "Tidak berhak mengakses sumber ini")
    if s.schema_json and s.schema_json.get("columns"):
        return s.schema_json

    async def introspect():
        try:
            reader, _fmt, _syn = await _resolve_source(db, sid)
        except ValueError as e:
            raise ApiError(400, "bad_source", str(e)) from e
        con = _connect()
        try:
            rows = con.execute(f"DESCRIBE SELECT * FROM {reader} LIMIT 0;").fetchall()
            return {"columns": [{"name": r[0], "type": str(r[1])} for r in rows]}
        finally:
            con.close()

    schema, _from_cache = await fetch_schema_payload(sid, introspect)
    s.schema_json = schema
    await db.commit()
    return schema


@router.post("/pipelines", status_code=201)
async def create_pipeline(
    body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    base = slugify(body["title"])
    pslug = base
    if (await db.execute(select(Pipeline).where(Pipeline.slug == pslug))).scalar_one_or_none():
        pslug = f"{base}-{uuid.uuid4().hex[:4]}"
    team_id = body.get("team_id")
    if team_id and not await membership(db, team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    pl = Pipeline(
        slug=pslug,
        owner_id=user.id,
        team_id=team_id,
        room_id=body.get("room_id"),
        title=body["title"],
        spec_json=body.get("spec") or {"nodes": [], "edges": []},
        engine=(body.get("engine") or "auto").lower(),
        schedule_cron=body.get("schedule_cron"),
    )
    await _validate_and_set(db, pl, user)
    db.add(pl)
    await db.commit()
    return {"slug": pl.slug, "status": pl.status}


@router.get("/pipelines")
async def list_pipelines(
    p: PageParams = Depends(page_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Pipeline).where(Pipeline.owner_id == user.id).order_by(Pipeline.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated(
        [{"id": x.id, "slug": x.slug, "title": x.title, "status": x.status} for x in rows], total, p
    )


@router.get("/pipelines/{slug}")
async def get_pipeline(slug: str, db: AsyncSession = Depends(get_db)):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl:
        raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    return {
        "id": pl.id,
        "slug": pl.slug,
        "title": pl.title,
        "status": pl.status,
        "spec": pl.spec_json,
        "validation_error": pl.validation_error,
        "team_id": pl.team_id,
        "room_id": pl.room_id,
        "engine": pl.engine,
        "schedule_cron": pl.schedule_cron,
    }


@router.patch("/pipelines/{slug}")
async def update_pipeline(
    slug: str,
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl:
        raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    await _can_edit_pipeline(db, pl, user)
    if "title" in body:
        pl.title = body["title"]
    if "spec" in body:
        pl.spec_json = body["spec"]
    if "engine" in body:
        eng = (body["engine"] or "auto").lower()
        if eng not in ("auto", "duckdb", "spark"):
            raise ApiError(422, "bad_engine", "Engine harus auto, duckdb, atau spark")
        pl.engine = eng
    if "schedule_cron" in body:
        pl.schedule_cron = body["schedule_cron"]
    errors = await _validate_and_set(db, pl, user)
    await db.commit()
    return {"slug": pl.slug, "status": pl.status, "errors": errors}


@router.post("/pipelines/{slug}/validate")
async def validate_pipeline(
    slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl:
        raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    errors = await _validate_and_set(db, pl, user)
    await db.commit()
    return {"status": pl.status, "errors": errors}


@router.delete("/pipelines/{slug}", status_code=204)
async def delete_pipeline(
    slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if pl:
        await _can_edit_pipeline(db, pl, user)
        await db.delete(pl)
        await db.commit()


@router.post("/pipelines/{slug}/run", status_code=202)
async def run_pipeline(
    slug: str,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pl = await _get_pipeline_by_slug(db, slug)
    await _can_edit_pipeline(db, pl, user)
    if pl.status != "valid":
        raise ApiError(400, "invalid", "Pipeline belum valid")
    q = quota_for(user)
    if await _runs_today(db, user.id) >= q["runs_per_day"]:
        raise ApiError(429, "quota_exceeded", "Kuota run harian habis. Naik tier untuk lebih banyak.")
    run = PipelineRun(pipeline_id=pl.id, status="queued")
    db.add(run)
    await db.commit()
    ep = from_psd_pipeline(pl)
    est = await estimate_pipeline_bytes(db, pl)
    plan = plan_execution(ep, est_bytes=est or None)
    if plan["engine"] == "spark" and not settings.PSD_SPARK_ENABLED:
        raise ApiError(
            503,
            "spark_disabled",
            "Engine Spark dipilih tetapi PSD_SPARK_ENABLED=false. Gunakan duckdb atau aktifkan Spark.",
        )
    run.execution_engine = plan["engine"]
    await db.commit()
    extra = submit_pipeline(run.id, q["max_rows"], bg, engine=plan["engine"], queue=plan["queue"])
    return {"run_id": run.id, "status": run.status, **extra}


@router.get("/pipelines/{slug}/airflow-dag")
async def export_airflow_dag(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pl = await _get_pipeline_by_slug(db, slug)
    await _can_edit_pipeline(db, pl, user)
    if not pl.schedule_cron:
        raise ApiError(400, "no_schedule", "Pipeline belum punya schedule_cron untuk Airflow.")
    ep = from_psd_pipeline(pl)
    code = render_dag(ep, dag_id=f"psd_{pl.slug.replace('-', '_')}", schedule=pl.schedule_cron)
    return {"dag_id": f"psd_{pl.slug.replace('-', '_')}", "code": code}


@router.get("/pipelines/{slug}/runs")
async def list_runs(slug: str, db: AsyncSession = Depends(get_db)):
    pl = await _get_pipeline_by_slug(db, slug)
    rows = (
        await db.execute(
            select(PipelineRun)
            .where(PipelineRun.pipeline_id == pl.id)
            .order_by(PipelineRun.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    return {
        "items": [
            {
                "id": r.id,
                "status": r.status,
                "rows_out": r.rows_out,
                "duration_ms": r.duration_ms,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "execution_engine": r.execution_engine,
            }
            for r in rows
        ]
    }


@router.get("/pipelines/{slug}/runs/{run_id}")
async def run_detail(slug: str, run_id: str, db: AsyncSession = Depends(get_db)):
    pl = await _get_pipeline_by_slug(db, slug)
    r = (
        await db.execute(
            select(PipelineRun).where(PipelineRun.id == run_id, PipelineRun.pipeline_id == pl.id)
        )
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Run tidak ditemukan")
    return {
        "id": r.id,
        "status": r.status,
        "rows_out": r.rows_out,
        "layers": r.layers_json or {},
        "lineage": r.lineage_json or {},
        "error": r.error,
        "duration_ms": r.duration_ms,
        "execution_engine": r.execution_engine,
    }


@router.get("/pipelines/{slug}/runs/{run_id}/download")
async def download_layer(
    slug: str,
    run_id: str,
    uri: str,
    db: AsyncSession = Depends(get_db),
):
    pl = await _get_pipeline_by_slug(db, slug)
    r = (
        await db.execute(
            select(PipelineRun).where(PipelineRun.id == run_id, PipelineRun.pipeline_id == pl.id)
        )
    ).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Run tidak ditemukan")
    key = asset_key_from_uri(uri)
    if not key:
        raise ApiError(400, "bad_uri", "URI lapisan tidak valid")
    allowed = False
    for items in (r.layers_json or {}).values():
        for item in items:
            if item.get("uri") == uri:
                allowed = True
                break
    if not allowed:
        raise ApiError(403, "forbidden", "URI tidak termasuk run ini")
    return {"url": presigned_asset_get(key)}


async def _can_edit_dashboard(db: AsyncSession, d: Dashboard, user: User) -> None:
    await can_edit_dashboard(db, d, user)


async def _latest_gold_map(db: AsyncSession, dashboard: Dashboard) -> dict[str, str]:
    return await latest_gold_map(db, dashboard)


async def _get_dashboard_by_slug(db: AsyncSession, slug: str) -> Dashboard:
    return await get_dashboard_by_slug(db, slug)


@router.post("/dashboards", status_code=201)
async def create_dashboard(
    body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    base = slugify(body["title"])
    dslug = base
    if (await db.execute(select(Dashboard).where(Dashboard.slug == dslug))).scalar_one_or_none():
        dslug = f"{base}-{uuid.uuid4().hex[:4]}"
    team_id = body.get("team_id")
    if team_id and not await membership(db, team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    d = Dashboard(
        slug=dslug,
        owner_id=user.id,
        team_id=team_id,
        room_id=body.get("room_id"),
        pipeline_id=body.get("pipeline_id"),
        title=body["title"],
        description_md=body.get("description_md", ""),
        visibility=body.get("visibility", "private"),
    )
    db.add(d)
    await db.commit()
    return {"slug": d.slug}


@router.get("/dashboards")
async def list_dashboards(
    p: PageParams = Depends(page_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Dashboard).where(Dashboard.owner_id == user.id).order_by(Dashboard.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated(
        [{"slug": x.slug, "title": x.title, "visibility": x.visibility, "pipeline_id": x.pipeline_id} for x in rows],
        total,
        p,
    )


@router.get("/dashboards/{slug}")
async def get_dashboard(
    slug: str, viewer: User | None = Depends(get_current_user_optional), db: AsyncSession = Depends(get_db)
):
    d = await _get_dashboard_by_slug(db, slug)
    if d.visibility != "public":
        ok = viewer and (
            d.owner_id == viewer.id or (d.team_id and await membership(db, d.team_id, viewer.id))
        )
        if not ok:
            raise ApiError(403, "private", "Dashboard privat")
    widgets = (await db.execute(select(Widget).where(Widget.dashboard_id == d.id))).scalars().all()
    return {
        "slug": d.slug,
        "title": d.title,
        "description_md": d.description_md,
        "visibility": d.visibility,
        "layout": d.layout_json,
        "pipeline_id": d.pipeline_id,
        "owner_id": d.owner_id,
        "superset_dataset_id": d.superset_dataset_id,
        "superset_dashboard_id": d.superset_dashboard_id,
        "superset_embed_uuid": d.superset_embed_uuid,
        "superset_gold_table": d.superset_gold_table,
        "widgets": [
            {
                "id": w.id,
                "kind": w.kind,
                "title": w.title,
                "query": w.query_json,
                "options": w.options_json,
            }
            for w in widgets
        ],
    }


@router.patch("/dashboards/{slug}")
async def update_dashboard(
    slug: str, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    d = await _get_dashboard_by_slug(db, slug)
    await _can_edit_dashboard(db, d, user)
    for k in ("title", "description_md", "layout_json", "visibility", "pipeline_id"):
        bk = "layout" if k == "layout_json" else k
        if bk in body:
            setattr(d, k, body[bk])
    await db.commit()
    return {"slug": d.slug}


@router.delete("/dashboards/{slug}", status_code=204)
async def delete_dashboard(
    slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if d:
        await _can_edit_dashboard(db, d, user)
        await db.delete(d)
        await db.commit()


@router.post("/dashboards/{slug}/widgets", status_code=201)
async def add_widget(
    slug: str, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    d = await _get_dashboard_by_slug(db, slug)
    await _can_edit_dashboard(db, d, user)
    if body.get("kind") not in ("kpi", "table", "line", "bar", "pie", "scatter"):
        raise ApiError(422, "bad_kind", "Jenis widget tidak valid")
    w = Widget(
        dashboard_id=d.id,
        kind=body["kind"],
        title=body.get("title", ""),
        query_json=body.get("query", {}),
        options_json=body.get("options", {}),
    )
    db.add(w)
    await db.commit()
    return {"id": w.id}


@router.patch("/dashboards/{slug}/widgets/{wid}")
async def update_widget(
    slug: str, wid: str, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    d = await _get_dashboard_by_slug(db, slug)
    await _can_edit_dashboard(db, d, user)
    w = (
        await db.execute(select(Widget).where(Widget.id == wid, Widget.dashboard_id == d.id))
    ).scalar_one_or_none()
    if not w:
        raise ApiError(404, "not_found", "Widget tidak ditemukan")
    for k in ("kind", "title", "query_json", "options_json"):
        bk = {"query_json": "query", "options_json": "options"}.get(k, k)
        if bk in body:
            setattr(w, k, body[bk])
    await db.commit()
    return {"id": w.id}


@router.delete("/dashboards/{slug}/widgets/{wid}", status_code=204)
async def delete_widget(
    slug: str, wid: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if d:
        await _can_edit_dashboard(db, d, user)
        w = (
            await db.execute(select(Widget).where(Widget.id == wid, Widget.dashboard_id == d.id))
        ).scalar_one_or_none()
        if w:
            await db.delete(w)
            await db.commit()


@router.get("/dashboards/{slug}/widgets/{wid}/data")
async def widget_data_endpoint(
    slug: str,
    wid: str,
    viewer: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    d = await _get_dashboard_by_slug(db, slug)
    if d.visibility != "public":
        ok = viewer and (
            d.owner_id == viewer.id or (d.team_id and await membership(db, d.team_id, viewer.id))
        )
        if not ok:
            raise ApiError(403, "private", "Dashboard privat")
    w = (
        await db.execute(select(Widget).where(Widget.id == wid, Widget.dashboard_id == d.id))
    ).scalar_one_or_none()
    if not w:
        raise ApiError(404, "not_found", "Widget tidak ditemukan")
    gold = await _latest_gold_map(db, d)
    qjson = w.query_json or {}
    uri = qjson.get("uri") or gold.get(qjson.get("node"))
    if not uri:
        return {"empty": True, "reason": "Belum ada run gold untuk node ini"}
    run = await latest_done_run(db, d.pipeline_id)
    run_id = run.id if run else "none"
    return fetch_widget_payload(run_id, wid, uri, w.kind, qjson)
