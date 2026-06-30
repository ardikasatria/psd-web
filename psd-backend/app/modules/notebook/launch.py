"""Hitung kernel berjalan & launch notebook (browser / JupyterHub server)."""
from __future__ import annotations

from app.core.config import settings
from app.core.errors import ApiError
from app.core.redis import redis_client
from psd_gamification.tiers import tier_slug_for_reputation
from psd_notebook import jupyterlite, runtime as nb_runtime
from psd_notebook.policy import NotebookQuotaError, limits_for, check_can_start_kernel


KERNEL_COUNT_KEY = "notebook:kernels:{user_id}"


async def user_tier_slug(user) -> str:
    return tier_slug_for_reputation(user.reputation or 0)


async def running_kernel_count(user_id: str) -> int:
    try:
        raw = await redis_client.get(KERNEL_COUNT_KEY.format(user_id=user_id))
        return int(raw or 0)
    except Exception:
        return 0


async def increment_kernel_count(user_id: str) -> int:
    try:
        key = KERNEL_COUNT_KEY.format(user_id=user_id)
        val = await redis_client.incr(key)
        await redis_client.expire(key, 86400)
        return int(val)
    except Exception:
        return 0


async def decrement_kernel_count(user_id: str) -> int:
    try:
        key = KERNEL_COUNT_KEY.format(user_id=user_id)
        val = await redis_client.decr(key)
        if val < 0:
            await redis_client.set(key, 0)
            return 0
        return int(val)
    except Exception:
        return 0


def _hub_api_url() -> str:
    if settings.PSD_HUB_API_URL:
        return settings.PSD_HUB_API_URL.rstrip("/")
    return f"{settings.PSD_OAUTH_HUB_BASE_URL.rstrip('/')}/hub/api"


def _hub_client():
    from app.hub.hub_client import JupyterHubClient

    if not settings.PSD_HUB_SERVICE_TOKEN:
        raise ApiError(503, "hub_disabled", "Token service JupyterHub belum dikonfigurasi.")
    return JupyterHubClient(_hub_api_url(), settings.PSD_HUB_SERVICE_TOKEN)


def tier_allows_server(tier: str) -> bool:
    return limits_for(tier).runtime in ("server", "both")


async def launch_notebook(
    *,
    tier: str,
    requested_runtime: str | None,
    user_id: str,
    username: str,
    api_base: str,
) -> dict:
    try:
        chosen = nb_runtime.choose_runtime(tier, requested_runtime)
    except NotebookQuotaError as exc:
        if requested_runtime == "server":
            raise ApiError(403, "kernel_access_required", str(exc)) from exc
        raise ApiError(429, "kernel_limit", str(exc)) from exc

    if chosen == "browser":
        return {
            "runtime": "browser",
            "config": jupyterlite.browser_config(tier, api_base=api_base),
        }

    running = await running_kernel_count(user_id)
    lim = limits_for(tier)
    try:
        check_can_start_kernel(tier, running)
    except NotebookQuotaError as exc:
        raise ApiError(429, "kernel_limit", str(exc)) from exc

    if not settings.PSD_HUB_ENABLED:
        raise ApiError(503, "hub_disabled", "JupyterHub belum aktif di lingkungan ini.")

    from app.hub import launch as hub_launch
    from app.hub.hub_client import HubError

    client = _hub_client()
    try:
        cfg = hub_launch.open_server_runtime(
            client,
            name=username,
            hub_public_url=settings.PSD_OAUTH_HUB_BASE_URL.rstrip("/"),
            grant_active=tier_allows_server(tier),
            running_count=running,
            max_concurrent=lim.max_concurrent_kernels,
            token_ttl=settings.PSD_HUB_TOKEN_TTL,
        )
    except hub_launch.HubAccessError as exc:
        raise ApiError(exc.status, exc.slug, exc.message) from exc
    except HubError as exc:
        code = "hub_timeout" if exc.status == 504 else "hub_error"
        raise ApiError(exc.status if exc.status in (502, 504) else 502, code, str(exc)) from exc

    await increment_kernel_count(user_id)
    return cfg


async def stop_server_runtime(*, user_id: str, username: str) -> dict:
    if not settings.PSD_HUB_ENABLED or not settings.PSD_HUB_SERVICE_TOKEN:
        return {"stopped": False}
    client = _hub_client()
    try:
        client.stop_server(username)
    except Exception:
        pass
    await decrement_kernel_count(user_id)
    return {"stopped": True}


def hub_runtime_status(username: str) -> dict:
    if not settings.PSD_HUB_ENABLED or not settings.PSD_HUB_SERVICE_TOKEN:
        return {"ready": False, "pending": None}
    from app.hub import hub_urls

    client = _hub_client()
    try:
        model = client.get_user(username)
    except Exception:
        return {"ready": False, "pending": "unknown"}
    ready = hub_urls.server_ready(model)
    pending = None if ready else (model.get("pending") or "spawn")
    return {"ready": ready, "pending": pending}
