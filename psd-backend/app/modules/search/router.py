from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.search import client
from app.modules.search.universal import (
    REPO_KINDS,
    build_response,
    hit_from_competition,
    hit_from_repo,
    hit_from_user,
    normalize_type,
)
from app.modules.users.models import User
from app.modules.users.settings import is_searchable

router = APIRouter(tags=["search"])


def _legacy_out() -> dict:
    return {"repos": [], "competitions": [], "users": []}


@router.get("/search")
async def search(
    q: str = Query(...),
    type: str | None = None,
    limit: int = Query(60, ge=1, le=200),
    per_category: int = Query(6, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    kind_filter = normalize_type(type)

    # Kompatibilitas mundur: klien lama memanggil type=repos|competitions tanpa limit.
    if type in ("repos", "competitions") and limit == 60:
        out = _legacy_out()
        if type == "repos":
            res = client.index("repos").search(
                q, {"limit": 10, "filter": 'visibility = "public"'}
            )
            out["repos"] = res["hits"]
        else:
            res = client.index("competitions").search(q, {"limit": 10})
            out["competitions"] = res["hits"]
        return out

    hits: list[dict] = []
    search_repos = kind_filter is None or kind_filter in REPO_KINDS
    search_comps = kind_filter is None or kind_filter == "competition"
    search_users = kind_filter is None or kind_filter == "user"

    if search_repos:
        meili_limit = min(limit, 40)
        res = client.index("repos").search(
            q, {"limit": meili_limit, "filter": 'visibility = "public"'}
        )
        for doc in res["hits"]:
            hit = hit_from_repo(doc)
            if kind_filter and hit["kind"] != kind_filter:
                continue
            hits.append(hit)

    if search_comps:
        res = client.index("competitions").search(q, {"limit": min(limit, 20)})
        hits.extend(hit_from_competition(doc) for doc in res["hits"])

    if search_users:
        stmt = (
            select(User)
            .where(or_(User.username.ilike(f"%{q}%"), User.name.ilike(f"%{q}%")))
            .limit(min(limit, 20))
        )
        rows = (await db.execute(stmt)).scalars().all()
        for u in rows:
            if not is_searchable(getattr(u, "settings", None)):
                continue
            hits.append(
                hit_from_user(
                    {
                        "id": u.id,
                        "username": u.username,
                        "name": u.name,
                        "avatar_url": u.avatar_url,
                        "is_official": bool(u.is_official),
                    }
                )
            )

    return build_response(q, hits, limit=limit, per_category=per_category)
