from sqlalchemy import select

from app.modules.notifications.models import Notification
from app.modules.users.models import User
from app.modules.users.settings import merged


async def _inapp_enabled(db, user_id: str) -> bool:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not user:
        return True
    return bool(merged(user.settings)["notifications"]["inapp"])


async def notify(db, user_id, type, title, body="", link=None, actor_id=None):
    if user_id == actor_id:
        return
    if not await _inapp_enabled(db, user_id):
        return
    db.add(
        Notification(
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            link=link,
            actor_id=actor_id,
        )
    )
    await db.commit()


async def notify_staff(db, type, title, body="", link=None, actor_id=None):
    staff = (
        await db.execute(select(User).where(User.role.in_(["moderator", "superadmin"])))
    ).scalars().all()
    for u in staff:
        if u.id == actor_id:
            continue
        if not await _inapp_enabled(db, u.id):
            continue
        db.add(
            Notification(
                user_id=u.id,
                type=type,
                title=title,
                body=body,
                link=link,
                actor_id=actor_id,
            )
        )
    await db.commit()
