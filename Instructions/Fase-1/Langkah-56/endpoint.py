"""
Endpoint inferensi (Langkah 56, sub-langkah 1 & 2).

POST /api/models/{name}/predict
  1. Pastikan pengguna login (sesi PSD).
  2. Cek & konsumsi kuota tier (rem biaya) → 429 bila habis.
  3. Inferensi via InferenceService (model dari registry).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import seams
from .quota import QuotaExceeded, check_and_consume
from .service import InferenceService

router = APIRouter(prefix="/api/models", tags=["serving"])


class PredictReq(BaseModel):
    inputs: list | dict
    stage: str = "Production"


# --- dependency (override di produksi & uji) ---
async def get_current_user():
    raise NotImplementedError("Sambungkan ke sesi pengguna PSD.")


async def get_service() -> InferenceService:
    raise NotImplementedError("Sediakan InferenceService.")


async def get_quota_store():
    raise NotImplementedError("Sediakan store kuota (Redis/in-memory).")


@router.post("/{name}/predict")
async def predict(name: str, body: PredictReq,
                  user=Depends(get_current_user),
                  svc: InferenceService = Depends(get_service),
                  store=Depends(get_quota_store)):
    tier = seams.user_tier(user)
    try:
        quota = check_and_consume(store, seams.user_id(user), tier)
    except QuotaExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))

    result = svc.predict(name, body.inputs, stage=body.stage)
    result["quota"] = quota
    return result
