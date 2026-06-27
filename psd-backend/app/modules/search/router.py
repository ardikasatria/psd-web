from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.search import client
from app.modules.users.models import User
from app.modules.users.settings import is_searchable

router = APIRouter(tags=["search"])


@router.get("/search")
async def search(q: str = Query(...), type: str | None = None, db: AsyncSession = Depends(get_db)):
    out: dict = {"repos": [], "competitions": [], "users": []}
    targets = [type] if type in ("repos", "competitions", "users") else ["repos", "competitions", "users"]
    if "repos" in targets or "competitions" in targets:
        meili_targets = [t for t in targets if t in ("repos", "competitions")]
        for idx in meili_targets:
            res = client.index(idx).search(q, {"limit": 10})
            out[idx] = res["hits"]
    if "users" in targets:
        stmt = (
            select(User)
            .where(or_(User.username.ilike(f"%{q}%"), User.name.ilike(f"%{q}%")))
            .limit(10)
        )
        rows = (await db.execute(stmt)).scalars().all()
        out["users"] = [
            {
                "id": u.id,
                "username": u.username,
                "name": u.name,
                "avatar_url": u.avatar_url,
                "is_official": bool(u.is_official),
            }
            for u in rows
            if is_searchable(getattr(u, "settings", None))
        ]
    return out
