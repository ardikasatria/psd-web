"""Provisioning dataset (promote) & minting guest token (Langkah 53)."""
from __future__ import annotations

from .client import SupersetClient
from .settings import settings


async def promote_dashboard(client: SupersetClient, *, gold_table: str,
                            schema: str | None = None,
                            database_id: int | None = None) -> dict:
    """Saat pengguna 'promote' tampilan Ruang Analitik → buat dataset Superset
    terhadap tabel skema gold. Kembalikan {dataset_id}."""
    ds = await client.create_dataset(
        database_id=database_id or settings.GOLD_DATABASE_ID,
        schema=schema or settings.GOLD_SCHEMA,
        table_name=gold_table,
    )
    return {"dataset_id": ds.get("id")}


async def mint_guest_token(client: SupersetClient, *, user: dict,
                           dashboard_uuids: list[str], rls_clauses: list[dict]) -> str:
    """Cetak guest token untuk embedding, scoped ke dashboard + RLS."""
    resources = [{"type": "dashboard", "id": u} for u in dashboard_uuids]
    return await client.guest_token(user=user, resources=resources, rls=rls_clauses)
