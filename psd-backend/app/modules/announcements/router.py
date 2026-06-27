from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.modules.announcements.models import Announcement

router = APIRouter(tags=["announcements"])


@router.get("/announcements")
async def list_active(db: AsyncSession = Depends(get_db)):
    rows = (
        await db.execute(
            select(Announcement)
            .where(Announcement.active.is_(True))
            .order_by(Announcement.created_at.desc())
        )
    ).scalars().all()
    return [
        {"id": a.id, "title": a.title, "body_md": a.body_md, "level": a.level}
        for a in rows
    ]
