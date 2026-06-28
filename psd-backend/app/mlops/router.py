"""Endpoint registry MLflow & drift (Langkah 55)."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.mlops.models import DriftReport, ModelRegistry, ModelVersion
from app.mlops.provision import (
    create_registry,
    ensure_monitoring_dashboard,
    promote_version,
    register_version,
)
from app.mlops.seams import can_edit_registry, get_registry_by_slug
from app.modules.teams.deps import membership
from app.modules.users.models import User
from app.tasks.dispatch import submit_drift

router = APIRouter(prefix="/api/ml", tags=["mlops"])


class CreateRegistryReq(BaseModel):
    title: str = Field(..., min_length=2, max_length=120)
    repo_id: str | None = None
    competition_id: str | None = None
    room_id: str | None = None
    team_id: str | None = None
    reference_source_id: str | None = None
    features: list[dict] = Field(default_factory=list)
    description_md: str = ""


class RegisterVersionReq(BaseModel):
    repo_id: str | None = None
    submission_id: str | None = None
    run_id: str | None = None
    metrics: dict = Field(default_factory=dict)


class PromoteReq(BaseModel):
    version: str
    stage: str = "Production"


class DriftRunReq(BaseModel):
    current_source_id: str | None = None
    submission_id: str | None = None
    model_version: str | None = None


_STATUS_RANK = {"stable": 0, "moderate": 1, "significant": 2, "ok": -1}


def _drift_report_out(r: DriftReport) -> dict:
    metrics = r.metrics_json or {}
    rows = metrics.get("rows") or []
    psi_rows = [x for x in rows if x.get("metric") == "psi" and x.get("feature") != "__model__"]
    drift_status = None
    feature_drift: list[dict] = []
    if r.status == "done" and psi_rows:
        worst = max(psi_rows, key=lambda x: _STATUS_RANK.get(x.get("status", "stable"), 0))
        drift_status = worst.get("status", "stable")
        feature_drift = [
            {"feature": x["feature"], "psi": x["value"], "status": x.get("status", "stable")}
            for x in sorted(psi_rows, key=lambda x: x.get("value", 0), reverse=True)
        ]
    return {
        "id": r.id,
        "status": r.status,
        "overall_psi": r.overall_psi,
        "accuracy": r.accuracy,
        "drift_status": drift_status,
        "feature_drift": feature_drift,
        "alert_count": len(metrics.get("alerts") or []),
        "metrics": metrics,
        "error": r.error,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


def _registry_out(reg: ModelRegistry) -> dict:
    return {
        "slug": reg.slug,
        "title": reg.title,
        "description_md": reg.description_md,
        "mlflow_name": reg.mlflow_name,
        "repo_id": reg.repo_id,
        "competition_id": reg.competition_id,
        "room_id": reg.room_id,
        "team_id": reg.team_id,
        "reference_source_id": reg.reference_source_id,
        "features": reg.features_json or [],
        "monitoring_dashboard_id": reg.monitoring_dashboard_id,
        "monitoring_gold_uri": reg.monitoring_gold_uri,
        "created_at": reg.created_at.isoformat() if reg.created_at else None,
    }


@router.get("/registries")
async def list_registries(
    p: PageParams = Depends(page_params),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(ModelRegistry).where(ModelRegistry.owner_id == user.id).order_by(ModelRegistry.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_registry_out(r) for r in rows], total, p)


@router.post("/registries", status_code=201)
async def create_registry_endpoint(
    body: CreateRegistryReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not settings.PSD_MLFLOW_ENABLED:
        raise ApiError(503, "mlflow_disabled", "Integrasi MLflow tidak aktif.")
    if body.team_id and not await membership(db, body.team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    reg = await create_registry(
        db,
        user,
        title=body.title,
        repo_id=body.repo_id,
        competition_id=body.competition_id,
        room_id=body.room_id,
        team_id=body.team_id,
        reference_source_id=body.reference_source_id,
        features=body.features or None,
        description_md=body.description_md,
    )
    return _registry_out(reg)


@router.get("/registries/{slug}")
async def get_registry(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg = await get_registry_by_slug(db, slug)
    await can_edit_registry(db, reg, user)
    versions = (
        await db.execute(
            select(ModelVersion).where(ModelVersion.registry_id == reg.id).order_by(ModelVersion.version.desc())
        )
    ).scalars().all()
    dash_slug = None
    if reg.monitoring_dashboard_id:
        from app.modules.factory.models import Dashboard

        dash = (
            await db.execute(select(Dashboard).where(Dashboard.id == reg.monitoring_dashboard_id))
        ).scalar_one_or_none()
        dash_slug = dash.slug if dash else None
    return {
        **_registry_out(reg),
        "monitoring_dashboard_slug": dash_slug,
        "versions": [
            {
                "id": v.id,
                "version": v.version,
                "stage": v.stage,
                "metrics": v.metrics,
                "artifact_uri": v.artifact_uri,
                "mlflow_model_version": v.mlflow_model_version,
                "submission_id": v.submission_id,
                "repo_id": v.repo_id,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
    }


@router.post("/registries/{slug}/versions", status_code=201)
async def add_version(
    slug: str,
    body: RegisterVersionReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg = await get_registry_by_slug(db, slug)
    await can_edit_registry(db, reg, user)
    ver = await register_version(
        db,
        reg,
        user,
        repo_id=body.repo_id,
        submission_id=body.submission_id,
        metrics=body.metrics,
        run_id=body.run_id,
    )
    return {
        "id": ver.id,
        "version": ver.version,
        "metrics": ver.metrics,
        "artifact_uri": ver.artifact_uri,
        "mlflow_model_version": ver.mlflow_model_version,
    }


@router.post("/registries/{slug}/promote")
async def promote_model_version(
    slug: str,
    body: PromoteReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg = await get_registry_by_slug(db, slug)
    await can_edit_registry(db, reg, user)
    ver = await promote_version(db, reg, version=body.version, stage=body.stage)
    return {"version": ver.mlflow_model_version, "stage": ver.stage}


@router.post("/registries/{slug}/drift/run", status_code=202)
async def run_drift(
    slug: str,
    body: DriftRunReq,
    bg: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg = await get_registry_by_slug(db, slug)
    await can_edit_registry(db, reg, user)
    if not body.current_source_id and not body.submission_id:
        raise ApiError(422, "bad_request", "current_source_id atau submission_id wajib")
    report = DriftReport(registry_id=reg.id, status="queued")
    db.add(report)
    await db.commit()
    extra = submit_drift(
        report.id,
        bg,
        current_source_id=body.current_source_id,
        submission_id=body.submission_id,
        model_version=body.model_version,
    )
    return {"report_id": report.id, "status": report.status, **extra}


@router.get("/registries/{slug}/drift")
async def list_drift_reports(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg = await get_registry_by_slug(db, slug)
    await can_edit_registry(db, reg, user)
    rows = (
        await db.execute(
            select(DriftReport)
            .where(DriftReport.registry_id == reg.id)
            .order_by(DriftReport.created_at.desc())
            .limit(20)
        )
    ).scalars().all()
    return {
        "items": [_drift_report_out(r) for r in rows]
    }


@router.post("/registries/{slug}/monitoring", status_code=201)
async def create_monitoring_dashboard(
    slug: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    reg = await get_registry_by_slug(db, slug)
    await can_edit_registry(db, reg, user)
    dash = await ensure_monitoring_dashboard(db, reg, user)
    return {"dashboard_slug": dash.slug, "monitoring_gold_uri": reg.monitoring_gold_uri}
