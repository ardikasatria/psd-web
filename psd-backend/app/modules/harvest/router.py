import asyncio
import json
import logging
from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.modules.harvest import job as harvest_job
from app.modules.harvest.models import HarvestJob
from app.modules.harvest.routing import extract_records, slugify
from app.modules.harvest.source import validate_auth, validate_source_url
from app.modules.users.models import User

router = APIRouter(tags=["harvest"])
log = logging.getLogger(__name__)


def _ser(j: HarvestJob) -> dict:
    return {
        "id": j.id,
        "name": j.name,
        "status": j.status,
        "records_written": j.records_written,
        "result_dataset": j.result_dataset,
        "error": j.error,
        "source_url": j.source_url,
        "created_at": j.created_at.isoformat() if j.created_at else None,
    }


def _parse_json(text: str | None, default):
    if not text:
        return default
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return default


async def _get_owned_job(db: AsyncSession, job_id: str, user_id: str) -> HarvestJob:
    j = (
        await db.execute(select(HarvestJob).where(HarvestJob.id == job_id, HarvestJob.user_id == user_id))
    ).scalar_one_or_none()
    if not j:
        raise ApiError(404, "not_found", "Job tidak ditemukan")
    return j


async def _run_harvest_job(job_id: str) -> None:
    """Simulasi eksekusi async — fetch 1 halaman, tulis metadata hasil."""
    from app.core.db import SessionLocal

    await asyncio.sleep(2.5)
    async with SessionLocal() as db:
        j = (await db.execute(select(HarvestJob).where(HarvestJob.id == job_id))).scalar_one_or_none()
        if not j or j.status not in (harvest_job.QUEUED, harvest_job.RUNNING):
            return
        try:
            j.status = harvest_job.RUNNING
            await db.commit()
            field_map = _parse_json(j.field_map, None)
            async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
                params = _parse_json(j.params, {})
                resp = await client.request(j.method or "GET", j.source_url, params=params)
                resp.raise_for_status()
                payload = resp.json()
            rows = extract_records(payload, j.records_path, field_map)
            max_rec = j.max_records or len(rows)
            rows = rows[:max_rec]
            j.records_written = len(rows)
            slug_base = slugify(j.name)
            if j.output_mode == "version" and j.dataset_slug:
                j.result_dataset = j.dataset_slug
            else:
                j.result_dataset = f"harvest/{slug_base}"
            j.status = harvest_job.COMPLETED
            j.error = None
            j.run_started_at = None
        except Exception as e:
            log.exception("harvest job %s failed", job_id)
            j.status = harvest_job.FAILED
            j.error = str(e)[:500]
            j.run_started_at = None
        await db.commit()


@router.get("/harvest/jobs")
async def list_jobs(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(HarvestJob)
            .where(HarvestJob.user_id == user.id)
            .order_by(HarvestJob.created_at.desc())
            .limit(50)
        )
    ).scalars().all()
    return [_ser(j) for j in rows]


@router.get("/harvest/jobs/{job_id}")
async def get_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    j = await _get_owned_job(db, job_id, user.id)
    return _ser(j)


@router.post("/harvest/jobs", status_code=201)
async def create_job(
    body: dict,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    name = (body.get("name") or "").strip()
    if not name:
        raise ApiError(400, "empty_name", "Nama job wajib diisi")
    source_url = body.get("source_url") or ""
    validate_source_url(source_url)
    auth_type = validate_auth(body.get("auth_type") or "none")
    field_map = body.get("field_map")
    j = HarvestJob(
        user_id=user.id,
        name=name,
        source_url=source_url,
        method=body.get("method") or "GET",
        params=json.dumps(body.get("params") or {}),
        auth_type=auth_type,
        pagination=body.get("pagination") or "none",
        page_size=int(body.get("page_size") or 50),
        max_pages=body.get("max_pages"),
        max_records=body.get("max_records"),
        records_path=body.get("records_path"),
        cursor_path=body.get("cursor_path"),
        field_map=json.dumps(field_map) if field_map else None,
        rate_per_min=int(body.get("rate_per_min") or 30),
        output_mode=body.get("output_mode") or "new",
        output_format=body.get("output_format") or "csv",
        dataset_slug=body.get("dataset_slug"),
        status=harvest_job.DRAFT,
    )
    db.add(j)
    await db.commit()
    await db.refresh(j)
    return _ser(j)


@router.post("/harvest/jobs/{job_id}/run")
async def run_job(
    job_id: str,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    j = await _get_owned_job(db, job_id, user.id)
    j.status = harvest_job.apply_action(j.status, "queue")
    j.records_written = 0
    j.error = None
    j.result_dataset = None
    j.run_started_at = datetime.now(timezone.utc)
    await db.commit()
    bg.add_task(_run_harvest_job, j.id)
    return {"ok": True}


@router.post("/harvest/jobs/{job_id}/cancel")
async def cancel_job(
    job_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    j = await _get_owned_job(db, job_id, user.id)
    j.status = harvest_job.apply_action(j.status, "cancel")
    j.run_started_at = None
    await db.commit()
    return {"ok": True}


@router.post("/harvest/jobs/{job_id}/retry")
async def retry_job(
    job_id: str,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    j = await _get_owned_job(db, job_id, user.id)
    j.status = harvest_job.apply_action(j.status, "retry")
    j.error = None
    j.records_written = 0
    j.result_dataset = None
    j.run_started_at = datetime.now(timezone.utc)
    await db.commit()
    bg.add_task(_run_harvest_job, j.id)
    return {"ok": True}


@router.post("/harvest/preview")
async def preview(body: dict, user: User = Depends(get_current_user)):
    source_url = body.get("source_url") or ""
    validate_source_url(source_url)
    field_map = body.get("field_map")
    records_path = body.get("records_path")
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            params = body.get("params") or {}
            resp = await client.request(body.get("method") or "GET", source_url, params=params)
            resp.raise_for_status()
            payload = resp.json()
        rows = extract_records(payload, records_path, field_map)
        return {"rows": rows[:20]}
    except httpx.HTTPStatusError as e:
        raise ApiError(502, "upstream_error", f"API sumber mengembalikan {e.response.status_code}") from e
    except Exception as e:
        raise ApiError(502, "preview_failed", str(e)[:200]) from e
