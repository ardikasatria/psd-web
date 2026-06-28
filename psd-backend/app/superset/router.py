"""Endpoint guest token & promote (Langkah 53)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.modules.factory.dashboard_helpers import can_edit_dashboard, get_dashboard_by_slug, latest_gold_map
from app.modules.users.models import User
from app.superset import provisioning, rls, seams
from app.superset.client import SupersetClient
from app.superset.deps import get_superset_client

router = APIRouter(prefix="/api/bi", tags=["bi"])


def _embed_domains() -> list[str]:
    raw = settings.PSD_SUPERSET_EMBED_DOMAINS
    if isinstance(raw, str):
        return [d.strip() for d in raw.split(",") if d.strip()]
    return list(raw)


class GuestTokenReq(BaseModel):
    dashboard_key: str


class PromoteReq(BaseModel):
    superset_dashboard_id: int | None = None


class EnableEmbedReq(BaseModel):
    superset_dashboard_id: int = Field(..., ge=1)


@router.post("/guest-token")
async def guest_token(
    body: GuestTokenReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    client: SupersetClient = Depends(get_superset_client),
):
    d = await get_dashboard_by_slug(db, body.dashboard_key)
    if not await seams.user_can_view_dashboard(db, user, d):
        raise HTTPException(status_code=403, detail="Tidak berhak melihat dashboard ini.")

    uuid = seams.embeddable_dashboard_uuid(d)
    team_id = await seams.dashboard_team_rls_id(db, d)
    rls_clauses = rls.team_rls(team_id, dataset_id=d.superset_dataset_id)

    token = await provisioning.mint_guest_token(
        client,
        user=seams.superset_identity(user),
        dashboard_uuids=[uuid],
        rls_clauses=rls_clauses,
    )
    return {
        "token": token,
        "uuid": uuid,
        "supersetDomain": settings.PSD_SUPERSET_PUBLIC_URL.rstrip("/"),
    }


@router.post("/dashboards/{slug}/promote")
async def promote_dashboard_to_superset(
    slug: str,
    body: PromoteReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    client: SupersetClient = Depends(get_superset_client),
):
    if not settings.PSD_SUPERSET_ENABLED:
        raise ApiError(503, "superset_disabled", "Integrasi Superset tidak aktif.")

    d = await get_dashboard_by_slug(db, slug)
    await can_edit_dashboard(db, d, user)

    gold_map = await latest_gold_map(db, d)
    if not gold_map:
        raise ApiError(422, "no_gold", "Pipeline belum punya output gold.")

    gold_table = seams.sanitize_gold_table(next(iter(gold_map.keys())))
    out = await provisioning.promote_dashboard(client, gold_table=gold_table)
    d.superset_dataset_id = out["dataset_id"]
    d.superset_gold_table = gold_table

    if body.superset_dashboard_id:
        uuid = await client.enable_embedded(
            body.superset_dashboard_id,
            _embed_domains(),
        )
        d.superset_dashboard_id = body.superset_dashboard_id
        d.superset_embed_uuid = uuid

    await db.commit()
    return {
        "dataset_id": d.superset_dataset_id,
        "gold_table": d.superset_gold_table,
        "embed_uuid": d.superset_embed_uuid,
    }


@router.post("/dashboards/{slug}/enable-embed")
async def enable_dashboard_embed(
    slug: str,
    body: EnableEmbedReq,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    client: SupersetClient = Depends(get_superset_client),
):
    if not settings.PSD_SUPERSET_ENABLED:
        raise ApiError(503, "superset_disabled", "Integrasi Superset tidak aktif.")

    d = await get_dashboard_by_slug(db, slug)
    await can_edit_dashboard(db, d, user)

    uuid = await client.enable_embedded(body.superset_dashboard_id, _embed_domains())
    d.superset_dashboard_id = body.superset_dashboard_id
    d.superset_embed_uuid = uuid
    await db.commit()
    return {"embed_uuid": uuid, "superset_dashboard_id": body.superset_dashboard_id}
