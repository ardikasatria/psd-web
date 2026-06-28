"""Endpoint inferensi (Langkah 56)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.modules.users.models import User
from app.serving import scaling, seams
from app.serving.deps import get_inference_service, get_quota_store, resolve_mlflow_name
from app.serving.quota import QuotaExceeded, check_and_consume, limit_for
from app.serving.service import InferenceService

router = APIRouter(prefix="/api/models", tags=["serving"])


class PredictReq(BaseModel):
    inputs: list | dict
    stage: str = "Production"


@router.get("/me/quota")
async def serving_quota(user: User = Depends(get_current_user)):
    tier = seams.user_tier(user)
    limit = limit_for(tier)
    store = get_quota_store()
    used = store.incr(seams.user_id(user), 0)
    return {"tier": tier, "limit": limit, "used": used, "remaining": max(0, limit - used)}


@router.get("/{name}/scaling")
async def model_scaling(
    name: str,
    rps: float = 0,
    target_rps_per_replica: float = 10,
    min_replicas: int = 1,
    max_replicas: int = 10,
    user: User = Depends(get_current_user),
):
    del user
    if not settings.PSD_SERVING_ENABLED:
        raise ApiError(503, "serving_disabled", "Serving model tidak aktif.")
    mlflow_name = await resolve_mlflow_name(name)
    replicas = scaling.desired_replicas(
        rps=rps,
        target_rps_per_replica=target_rps_per_replica,
        min_replicas=min_replicas,
        max_replicas=max_replicas,
    )
    return {"model": mlflow_name, "desired_replicas": replicas, "rps": rps}


@router.post("/{name}/predict")
async def predict(
    name: str,
    body: PredictReq,
    user: User = Depends(get_current_user),
    svc: InferenceService = Depends(get_inference_service),
    store=Depends(get_quota_store),
):
    if not settings.PSD_SERVING_ENABLED:
        raise ApiError(503, "serving_disabled", "Serving model tidak aktif.")
    if not settings.PSD_MLFLOW_ENABLED:
        raise ApiError(503, "mlflow_disabled", "Integrasi MLflow tidak aktif.")

    tier = seams.user_tier(user)
    try:
        quota = check_and_consume(store, seams.user_id(user), tier)
    except QuotaExceeded as e:
        raise ApiError(429, "quota_exceeded", str(e))

    mlflow_name = await resolve_mlflow_name(name)
    try:
        result = svc.predict(mlflow_name, body.inputs, stage=body.stage)
    except Exception as e:
        raise ApiError(422, "predict_failed", str(e)[:300])
    result["quota"] = quota
    result["model"] = mlflow_name
    return result
