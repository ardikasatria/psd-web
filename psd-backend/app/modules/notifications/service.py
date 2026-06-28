import uuid

from sqlalchemy import select

from app.email.integration import schedule_event_email
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
    inapp = await _inapp_enabled(db, user_id)
    notification_id = f"ntf_{uuid.uuid4().hex[:12]}"

    if inapp:
        n = Notification(
            id=notification_id,
            user_id=user_id,
            type=type,
            title=title,
            body=body,
            link=link,
            actor_id=actor_id,
        )
        db.add(n)
    await db.commit()

    schedule_event_email(
        notification_id=notification_id,
        user_id=user_id,
        event_type=type,
        title=title,
        body=body,
        link=link,
    )


async def notify_staff(db, type, title, body="", link=None, actor_id=None):
    staff = (
        await db.execute(select(User).where(User.role.in_(["moderator", "superadmin"])))
    ).scalars().all()
    for u in staff:
        if u.id == actor_id:
            continue
        await notify(db, u.id, type, title, body=body, link=link, actor_id=actor_id)
