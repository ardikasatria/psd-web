"""Hitung kernel berjalan & launch notebook."""
from __future__ import annotations

from app.core.config import settings
from app.core.redis import redis_client
from psd_gamification.tiers import tier_slug_for_reputation
from psd_notebook import service
from psd_notebook.policy import NotebookQuotaError


KERNEL_COUNT_KEY = "notebook:kernels:{user_id}"


async def user_tier_slug(user) -> str:
    return tier_slug_for_reputation(user.reputation or 0)


async def running_kernel_count(user_id: str) -> int:
    try:
        raw = await redis_client.get(KERNEL_COUNT_KEY.format(user_id=user_id))
        return int(raw or 0)
    except Exception:
        return 0


async def launch_notebook(
    *,
    tier: str,
    requested_runtime: str | None,
    user_id: str,
    api_base: str,
) -> dict:
    hub_url = None
    if settings.PSD_HUB_ENABLED:
        hub_url = settings.PSD_OAUTH_HUB_BASE_URL.rstrip("/")
    try:
        return await service.launch(
            tier=tier,
            requested_runtime=requested_runtime,
            api_base=api_base,
            running_kernels=await running_kernel_count(user_id),
            hub_url=hub_url,
        )
    except NotebookQuotaError as exc:
        from app.core.errors import ApiError

        raise ApiError(429, "limit_reached", str(exc)) from exc
