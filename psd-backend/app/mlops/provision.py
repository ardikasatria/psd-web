"""Provisioning registry PSD + dashboard monitoring (Langkah 55)."""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.errors import ApiError
from app.mlops.mlflow_sync import MlflowSyncClient
from app.mlops.models import ModelRegistry, ModelVersion
from app.mlops.monitoring import GOLD_TABLE, metric_row
from app.mlops.registry import RegistryService
from app.mlops.seams import (
    gold_uri_for_registry,
    infer_features,
    mlflow_model_name,
    resolve_repo_artifact_uri,
    resolve_source_uri,
    resolve_submission_uri,
)
from app.modules.categories.util import slugify
from app.modules.competitions.models import Submission
from app.modules.factory.models import Dashboard, Widget
from app.modules.repos.models import Repo
from app.modules.users.models import User


async def create_registry(
    db: AsyncSession,
    user: User,
    *,
    title: str,
    repo_id: str | None = None,
    competition_id: str | None = None,
    room_id: str | None = None,
    team_id: str | None = None,
    reference_source_id: str | None = None,
    features: list[dict] | None = None,
    description_md: str = "",
) -> ModelRegistry:
    if not settings.PSD_MLFLOW_ENABLED:
        raise ApiError(503, "mlflow_disabled", "Integrasi MLflow tidak aktif.")

    repo = None
    if repo_id:
        repo = (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none()
        if not repo or repo.kind != "model":
            raise ApiError(422, "bad_repo", "repo_id harus model repo yang valid")

    base = slugify(title)
    rslug = base
    if (await db.execute(select(ModelRegistry).where(ModelRegistry.slug == rslug))).scalar_one_or_none():
        rslug = f"{base}-{uuid.uuid4().hex[:4]}"

    name = mlflow_model_name(user.username, rslug)
    svc = RegistryService(MlflowSyncClient())
    svc.ensure_registered_model(name)

    feature_defs = list(features or [])
    if reference_source_id and not feature_defs:
        ref_uri = await resolve_source_uri(db, reference_source_id)
        from app.mlops.seams import load_column_map

        ref_cols = load_column_map(ref_uri)
        feature_defs = infer_features(ref_cols, ref_cols)

    reg = ModelRegistry(
        slug=rslug,
        owner_id=user.id,
        team_id=team_id,
        repo_id=repo_id,
        competition_id=competition_id,
        room_id=room_id,
        title=title,
        description_md=description_md,
        mlflow_name=name,
        reference_source_id=reference_source_id,
        features_json=feature_defs,
        monitoring_gold_uri=gold_uri_for_registry(rslug),
    )
    db.add(reg)
    await db.commit()
    await db.refresh(reg)

    if repo:
        await register_version(db, reg, user, repo_id=repo.id)

    return reg


async def register_version(
    db: AsyncSession,
    reg: ModelRegistry,
    user: User,
    *,
    repo_id: str | None = None,
    submission_id: str | None = None,
    metrics: dict | None = None,
    run_id: str | None = None,
) -> ModelVersion:
    del user
    if not repo_id and not submission_id and not run_id:
        raise ApiError(422, "bad_source", "repo_id, submission_id, atau run_id wajib")

    merged_metrics = dict(metrics or {})
    artifact_path = "model"

    if submission_id:
        sub = (
            await db.execute(select(Submission).where(Submission.id == submission_id))
        ).scalar_one_or_none()
        if not sub:
            raise ApiError(404, "not_found", "Submission tidak ditemukan")
        if sub.public_score is not None:
            merged_metrics.setdefault("public_score", sub.public_score)
        if sub.private_score is not None:
            merged_metrics.setdefault("private_score", sub.private_score)
        repo_id = repo_id or reg.repo_id

    sync = MlflowSyncClient()
    try:
        if not run_id:
            run_id = sync.create_run(tags={"psd_registry": reg.slug})
        if merged_metrics:
            sync.log_metrics(run_id, merged_metrics)

        svc = RegistryService(sync)
        mlflow_version = svc.register_from_run(
            name=reg.mlflow_name,
            run_id=run_id,
            artifact_path=artifact_path,
            tags={"sumber": "kompetisi" if submission_id else "repo"},
        )
    finally:
        sync.close()

    latest = (
        await db.execute(select(func.max(ModelVersion.version)).where(ModelVersion.registry_id == reg.id))
    ).scalar_one()
    version_num = int(latest or 0) + 1

    ver = ModelVersion(
        registry_id=reg.id,
        version=version_num,
        repo_id=repo_id,
        submission_id=submission_id,
        mlflow_run_id=run_id,
        mlflow_model_version=mlflow_version,
        metrics=merged_metrics,
        artifact_uri=f"runs:/{run_id}/{artifact_path}",
    )
    db.add(ver)
    await db.commit()
    await db.refresh(ver)
    return ver


async def promote_version(
    db: AsyncSession,
    reg: ModelRegistry,
    *,
    version: str,
    stage: str = "Production",
) -> ModelVersion:
    ver = (
        await db.execute(
            select(ModelVersion).where(
                ModelVersion.registry_id == reg.id,
                ModelVersion.mlflow_model_version == version,
            )
        )
    ).scalar_one_or_none()
    if not ver:
        raise ApiError(404, "not_found", "Versi model tidak ditemukan")

    sync = MlflowSyncClient()
    try:
        RegistryService(sync).promote(name=reg.mlflow_name, version=version, stage=stage)
    finally:
        sync.close()

    ver.stage = stage
    await db.commit()

    from app.serving.deps import invalidate_model_cache
    from app.serving import seams as serving_seams

    invalidate_model_cache(reg.mlflow_name)
    serving_seams.set_production_version(reg.mlflow_name, version)
    return ver


async def ensure_monitoring_dashboard(db: AsyncSession, reg: ModelRegistry, user: User) -> Dashboard:
    if reg.monitoring_dashboard_id:
        dash = (
            await db.execute(select(Dashboard).where(Dashboard.id == reg.monitoring_dashboard_id))
        ).scalar_one_or_none()
        if dash:
            return dash

    base = slugify(f"monitoring-{reg.slug}")
    dslug = base
    if (await db.execute(select(Dashboard).where(Dashboard.slug == dslug))).scalar_one_or_none():
        dslug = f"{base}-{uuid.uuid4().hex[:4]}"

    gold_uri = reg.monitoring_gold_uri or gold_uri_for_registry(reg.slug)
    dash = Dashboard(
        slug=dslug,
        owner_id=user.id,
        team_id=reg.team_id,
        room_id=reg.room_id,
        title=f"Monitoring — {reg.title}",
        description_md=f"Drift & metrik model `{reg.mlflow_name}` dari `{GOLD_TABLE}`.",
        visibility="private",
    )
    db.add(dash)
    await db.flush()

    widgets = [
        Widget(
            dashboard_id=dash.id,
            kind="kpi",
            title="PSI maksimum",
            query_json={
                "uri": gold_uri,
                "node": "monitoring",
                "y": "value",
                "agg": "max",
                "where_metric": "psi",
                "exclude_feature": "__model__",
            },
        ),
        Widget(
            dashboard_id=dash.id,
            kind="kpi",
            title="Akurasi terbaru",
            query_json={
                "uri": gold_uri,
                "node": "monitoring",
                "y": "value",
                "agg": "max",
                "where_metric": "accuracy",
                "where_feature": "__model__",
            },
        ),
        Widget(
            dashboard_id=dash.id,
            kind="bar",
            title="PSI per fitur",
            query_json={
                "uri": gold_uri,
                "node": "monitoring",
                "x": "feature",
                "y": "value",
                "agg": "max",
                "where_metric": "psi",
                "exclude_feature": "__model__",
            },
        ),
        Widget(
            dashboard_id=dash.id,
            kind="line",
            title="Tren PSI",
            query_json={
                "uri": gold_uri,
                "node": "monitoring",
                "x": "computed_at",
                "y": "value",
                "agg": "max",
                "where_metric": "psi",
                "exclude_feature": "__model__",
            },
        ),
    ]
    db.add_all(widgets)
    reg.monitoring_dashboard_id = dash.id
    reg.monitoring_gold_uri = gold_uri
    await db.commit()
    await db.refresh(dash)
    return dash
