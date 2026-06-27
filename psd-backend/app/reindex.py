"""Reindex Meilisearch — jalankan setelah seed atau impor data bulk."""

import asyncio

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.db import SessionLocal
from app.core.search import ensure_indexes, index_competition, index_repo
from app.register_models import register_models
from app.modules.competitions.models import Competition
from app.modules.repos.models import Repo

register_models()


async def run() -> None:
    ensure_indexes()
    async with SessionLocal() as db:
        repos = (await db.execute(select(Repo).options(selectinload(Repo.owner)))).scalars().all()
        for r in repos:
            index_repo(r)
        comps = (await db.execute(select(Competition))).scalars().all()
        for c in comps:
            index_competition(c)
    print(f"reindex selesai: {len(repos)} repos, {len(comps)} competitions")


if __name__ == "__main__":
    asyncio.run(run())
