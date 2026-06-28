"""Seam integrasi serving PSD (Langkah 56)."""
from __future__ import annotations

import logging

from app.core.config import settings
from app.hub.tiers import hub_tier_for_reputation
from app.modules.users.models import User

log = logging.getLogger(__name__)

_production_versions: dict[str, str] = {}
_gold_uri_by_model: dict[str, str] = {}


def load_model(uri: str):
    if not settings.PSD_MLFLOW_ENABLED:
        raise RuntimeError("MLflow tidak aktif — serving membutuhkan registry Langkah 55.")
    import mlflow

    mlflow.set_tracking_uri(settings.PSD_MLFLOW_TRACKING_URI)
    return mlflow.pyfunc.load_model(uri)


def user_id(user: User) -> str:
    return user.id


def user_tier(user: User) -> str:
    return hub_tier_for_reputation(getattr(user, "reputation", 0) or 0)


def set_production_version(model_name: str, version: str) -> None:
    _production_versions[model_name] = str(version)


def version_lookup(model_name: str, stage: str) -> str:
    if stage == "Production":
        return _production_versions.get(model_name, stage)
    return stage


def bind_gold_uri(model_name: str, gold_uri: str) -> None:
    _gold_uri_by_model[model_name] = gold_uri


def write_monitoring_rows(rows: list[dict], *, model_name: str) -> None:
    gold_uri = _gold_uri_by_model.get(model_name)
    if not gold_uri:
        log.debug("skip serving monitoring — gold_uri belum di-bind untuk %s", model_name)
        return
    from app.mlops import seams as mlops_seams

    prev = mlops_seams._drift_ctx.get("gold_uri")
    mlops_seams._drift_ctx["gold_uri"] = gold_uri
    try:
        mlops_seams.write_monitoring_rows(rows)
    finally:
        if prev is None:
            mlops_seams._drift_ctx.pop("gold_uri", None)
        else:
            mlops_seams._drift_ctx["gold_uri"] = prev


def trigger_retrain(model_name: str, reason: str) -> None:
    """Picu retraining — enqueue Celery bila tersedia, log bila tidak."""
    log.info("retrain_trigger model=%s reason=%s", model_name, reason)
    try:
        from app.tasks.tasks import run_retrain_job

        run_retrain_job.delay(model_name, reason)
    except Exception:
        log.warning("retrain_trigger queued locally model=%s", model_name)


def retrain_debounce_key(model_name: str) -> str:
    return f"serving:retrain:{model_name}"
