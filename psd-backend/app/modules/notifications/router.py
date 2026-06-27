from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.pagination import PageParams, page_params, paginated
from app.modules.notifications.models import Notification

router = APIRouter(tags=["notifications"])


def _ser(n: Notification):
    actor = None
    if n.actor:
        actor = {
            "username": n.actor.username,
            "avatar_url": n.actor.avatar_url,
            "type": "org" if n.actor.account_type == "organization" else "user",
        }
    return {
        "id": n.id,
        "type": n.type,
        "title": n.title,
        "body": n.body,
        "link": n.link,
        "actor": actor,
        "read": n.read,
        "created_at": n.created_at,
    }


@router.get("/me/notifications")
async def list_notifications(
    unread: bool = False,
    p: PageParams = Depends(page_params),
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread:
        stmt = stmt.where(Notification.read == False)  # noqa: E712
    stmt = stmt.order_by(Notification.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_ser(n) for n in rows], total, p)


@router.get("/me/notifications/unread-count")
async def unread_count(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    c = (
        await db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user.id,
                Notification.read == False,  # noqa: E712
            )
        )
    ).scalar_one()
    return {"count": c}


@router.post("/me/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    n = (
        await db.execute(
            select(Notification).where(Notification.id == nid, Notification.user_id == user.id)
        )
    ).scalar_one_or_none()
    if n:
        n.read = True
        await db.commit()
    return {"ok": True}


@router.post("/me/notifications/read-all")
async def mark_all(user=Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Notification).where(
                Notification.user_id == user.id,
                Notification.read == False,  # noqa: E712
            )
        )
    ).scalars().all()
    for n in rows:
        n.read = True
    await db.commit()
    return {"ok": True}
