"""Cek trigger retraining dari riwayat drift (Langkah 56)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.mlops.models import DriftReport, ModelRegistry
from app.serving import scaling, seams

_STATUS_RANK = {"stable": 0, "moderate": 1, "significant": 2, "ok": -1}


def _drift_status_from_report(report: DriftReport) -> str | None:
    metrics = report.metrics_json or {}
    psi_rows = [
        x for x in metrics.get("rows", []) if x.get("metric") == "psi" and x.get("feature") != "__model__"
    ]
    if not psi_rows:
        return None
    worst = max(psi_rows, key=lambda x: _STATUS_RANK.get(x.get("status", "stable"), 0))
    return worst.get("status", "stable")


async def maybe_trigger_retrain(db: AsyncSession, reg: ModelRegistry) -> bool:
    if not settings.PSD_SERVING_ENABLED:
        return False

    rows = (
        await db.execute(
            select(DriftReport)
            .where(DriftReport.registry_id == reg.id, DriftReport.status == "done")
            .order_by(DriftReport.created_at.desc())
            .limit(10)
        )
    ).scalars().all()
    statuses = []
    for report in reversed(list(rows)):
        status = _drift_status_from_report(report)
        if status:
            statuses.append(status)

    if not scaling.should_retrain(statuses):
        return False

    if settings.PSD_SERVING_REDIS_QUOTA:
        import redis

        client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        if not client.set(seams.retrain_debounce_key(reg.mlflow_name), "1", nx=True, ex=3600):
            return False

    seams.trigger_retrain(reg.mlflow_name, "drift_significant_consecutive")
    return True
