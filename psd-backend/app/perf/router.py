"""Endpoint statistik performa (Langkah 58)."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.modules.users.models import User
from app.modules.users.refs import is_staff
from app.perf.deps import get_registry

router = APIRouter(prefix="/api/perf", tags=["perf"])


@router.get("/stats")
async def perf_stats(user: User = Depends(get_current_user)):
    if not is_staff(user):
        raise ApiError(403, "forbidden", "Hanya staff yang dapat melihat statistik performa.")
    if not settings.PSD_PERF_ENABLED:
        return {"enabled": False, "metrics": {}}
    reg = get_registry()
    metrics = reg.all_stats()
    recommendations = {
        name: reg.should_cache(
            name,
            threshold_ms=settings.PSD_PERF_SLOW_THRESHOLD_MS,
            min_samples=settings.PSD_PERF_MIN_SAMPLES,
        )
        for name in metrics
    }
    return {
        "enabled": True,
        "cache_enabled": settings.PSD_PERF_CACHE_ENABLED,
        "cache_auto": settings.PSD_PERF_CACHE_AUTO,
        "threshold_ms": settings.PSD_PERF_SLOW_THRESHOLD_MS,
        "min_samples": settings.PSD_PERF_MIN_SAMPLES,
        "metrics": metrics,
        "should_cache": recommendations,
    }
