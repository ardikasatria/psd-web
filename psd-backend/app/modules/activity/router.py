from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.ratelimit import rate_limit
from app.modules.activity.models import ActivityEvent
from app.modules.activity.service import resolve_category_id
from app.modules.categories.models import Category
from app.modules.users.models import User
from app.modules.users.settings import merged

router = APIRouter(tags=["activity"])


@router.post("/track", dependencies=[rate_limit("track", 120, 60)])
async def track(
    body: dict,
    user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    if user and not merged(user.settings)["privacy"]["activity_tracking"]:
        return {"ok": True, "stored": 0}

    session_id = body.get("session_id")
    events = body.get("events", [])[:50]
    for e in events:
        meta = e.get("meta") or {}
        db.add(
            ActivityEvent(
                user_id=user.id if user else None,
                session_id=None if user else session_id,
                action=e.get("action", "view"),
                entity_type=e.get("entity_type"),
                entity_id=e.get("entity_id"),
                category_id=await resolve_category_id(db, e.get("category_id"), meta),
                meta=meta,
            )
        )
    await db.commit()
    return {"ok": True, "stored": len(events)}


@router.get("/me/activity-summary")
async def activity_summary(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    base = ActivityEvent.user_id == user.id

    rows = (
        await db.execute(
            select(ActivityEvent.category_id, func.count())
            .where(base, ActivityEvent.created_at >= since, ActivityEvent.category_id.isnot(None))
            .group_by(ActivityEvent.category_id)
            .order_by(func.count().desc())
            .limit(8)
        )
    ).all()
    cats = []
    for cid, n in rows:
        c = (await db.execute(select(Category).where(Category.id == cid))).scalar_one_or_none()
        if c:
            cats.append({"slug": c.slug, "name": c.name, "count": n})

    evs = (
        await db.execute(select(ActivityEvent.meta).where(base, ActivityEvent.created_at >= since))
    ).scalars().all()
    tagc: dict[str, int] = {}
    for m in evs:
        for t in (m or {}).get("tags", []):
            tagc[t] = tagc.get(t, 0) + 1
    top_tags = sorted(tagc.items(), key=lambda x: -x[1])[:10]

    acts = dict(
        (a, n)
        for a, n in (
            await db.execute(
                select(ActivityEvent.action, func.count())
                .where(base, ActivityEvent.created_at >= since)
                .group_by(ActivityEvent.action)
            )
        ).all()
    )

    return {
        "top_categories": cats,
        "top_tags": [{"tag": t, "count": n} for t, n in top_tags],
        "actions": acts,
        "window_days": 30,
    }
