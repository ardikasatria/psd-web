from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.activity.models import ActivityEvent
from app.modules.categories.models import Category


async def resolve_category_id(db: AsyncSession, category_id: str | None, meta: dict | None) -> str | None:
    if category_id:
        return category_id
    slug = (meta or {}).get("category_slug")
    if not slug:
        return None
    row = (
        await db.execute(select(Category.id).where(Category.slug == slug, Category.parent_id.is_(None)))
    ).scalar_one_or_none()
    return row


async def log_activity(
    db: AsyncSession,
    *,
    user_id: str | None = None,
    session_id: str | None = None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    category_id: str | None = None,
    meta: dict | None = None,
    commit: bool = True,
) -> None:
    meta = meta or {}
    cid = await resolve_category_id(db, category_id, meta)
    db.add(
        ActivityEvent(
            user_id=user_id,
            session_id=session_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            category_id=cid,
            meta=meta,
        )
    )
    if commit:
        await db.commit()
