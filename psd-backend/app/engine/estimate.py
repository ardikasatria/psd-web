"""Estimasi ukuran data pipeline untuk pemilih engine 'auto' (Langkah 54)."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.factory.models import DataSource, Pipeline
from app.modules.repos.models import Repo


async def estimate_pipeline_bytes(db: AsyncSession, pl: Pipeline) -> int:
    spec = pl.spec_json or {"nodes": [], "edges": []}
    total = 0
    seen: set[str] = set()
    for n in spec.get("nodes") or []:
        if n.get("type") != "source":
            continue
        sid = (n.get("params") or {}).get("source_id")
        if not sid or sid in seen:
            continue
        seen.add(sid)
        src = (await db.execute(select(DataSource).where(DataSource.id == sid))).scalar_one_or_none()
        if src is None:
            continue
        ds_slug = src.uri.replace("psd://dataset/", "")
        repo = (await db.execute(select(Repo).where(Repo.slug == ds_slug))).scalar_one_or_none()
        if repo is None:
            continue
        for f in repo.files or []:
            total += int(f.get("size_bytes") or 0)
    return total
