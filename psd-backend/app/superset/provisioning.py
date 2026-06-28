"""Provisioning dataset (promote) & minting guest token (Langkah 53)."""
from __future__ import annotations

from app.core.config import settings
from app.superset.client import SupersetClient


async def promote_dashboard(
    client: SupersetClient,
    *,
    gold_table: str,
    schema: str | None = None,
    database_id: int | None = None,
) -> dict:
    ds = await client.create_dataset(
        database_id=database_id or settings.PSD_SUPERSET_GOLD_DB_ID,
        schema=schema or settings.PSD_SUPERSET_GOLD_SCHEMA,
        table_name=gold_table,
    )
    return {"dataset_id": ds.get("id")}


async def mint_guest_token(
    client: SupersetClient,
    *,
    user: dict,
    dashboard_uuids: list[str],
    rls_clauses: list[dict],
) -> str:
    resources = [{"type": "dashboard", "id": u} for u in dashboard_uuids]
    return await client.guest_token(user=user, resources=resources, rls=rls_clauses)
