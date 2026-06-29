"""Akses kernel server via persetujuan admin (di luar tier gamifikasi)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.notebook_kernel.models import NotebookKernelRequest
from app.modules.users.models import User
from psd_notebook.policy import limits_for

GRANT_TIER = "ahli"
SETTINGS_GRANT_KEY = "notebook_kernel_granted"


def tier_allows_server(tier: str) -> bool:
    rt = limits_for(tier).runtime
    return rt in ("server", "both")


def user_settings_grant(user: User) -> bool:
    settings = user.settings if isinstance(user.settings, dict) else {}
    return bool(settings.get(SETTINGS_GRANT_KEY))


async def has_approved_kernel_grant(db: AsyncSession, user_id: str) -> bool:
    row = (
        await db.execute(
            select(NotebookKernelRequest.id).where(
                NotebookKernelRequest.user_id == user_id,
                NotebookKernelRequest.status == "approved",
            )
        )
    ).scalar_one_or_none()
    return row is not None


async def effective_notebook_tier(db: AsyncSession, user: User, reputation_tier: str) -> str:
    if tier_allows_server(reputation_tier):
        return reputation_tier
    if user_settings_grant(user) or await has_approved_kernel_grant(db, user.id):
        return GRANT_TIER
    return reputation_tier


async def apply_kernel_grant(db: AsyncSession, user: User, *, granted: bool) -> None:
    settings = dict(user.settings or {})
    if granted:
        settings[SETTINGS_GRANT_KEY] = True
    else:
        settings.pop(SETTINGS_GRANT_KEY, None)
    user.settings = settings
