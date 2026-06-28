# Langkah 29 — Notifikasi / Inbox

> **Tujuan:** Sistem pemberitahuan lintas-fitur (sosial, kompetisi, instruktur, course, dll.) dengan inbox & penanda belum dibaca. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 24 (sosial), 27 (roles).

## 29.1 Model — `app/modules/notifications/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.modules.users.models import User

class Notification(Base):
    __tablename__ = "notifications"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ntf_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)   # penerima
    type: Mapped[str] = mapped_column(String)        # follow|post_like|comment|instructor|course|competition|event|announcement|generic
    title: Mapped[str] = mapped_column(String)
    body: Mapped[str] = mapped_column(String, default="")
    link: Mapped[str | None] = mapped_column(String, nullable=True)
    actor_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    actor: Mapped[User | None] = relationship(foreign_keys=[actor_id], lazy="selectin")
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "notifications"
docker compose exec backend alembic upgrade head
```

## 29.2 Layanan — `app/modules/notifications/service.py`

```python
from sqlalchemy import select
from app.modules.notifications.models import Notification
from app.modules.users.models import User

async def notify(db, user_id, type, title, body="", link=None, actor_id=None):
    if user_id == actor_id:        # jangan beri tahu diri sendiri
        return
    db.add(Notification(user_id=user_id, type=type, title=title, body=body, link=link, actor_id=actor_id))
    await db.commit()

async def notify_staff(db, type, title, body="", link=None, actor_id=None):
    staff = (await db.execute(select(User).where(User.role.in_(["moderator", "superadmin"])))).scalars().all()
    for u in staff:
        db.add(Notification(user_id=u.id, type=type, title=title, body=body, link=link, actor_id=actor_id))
    await db.commit()
```

> Hormati setelan (Langkah 23): bila ingin, lewati pembuatan saat `notifications.inapp` mati. Default: tetap simpan (in-app murah).

## 29.3 Pasang pemicu (hooks)

| Kejadian | Lokasi | Panggilan |
|---|---|---|
| Diikuti | `POST /users/{u}/follow` (L24) | `notify(db, target.id, "follow", f"{actor} mulai mengikuti Anda", link=f"/u/{actor}", actor_id=user.id)` |
| Postingan disukai | `POST /posts/{id}/like` (L24) | `notify(db, author_id, "post_like", "Postingan Anda disukai", link=f"/community", actor_id=user.id)` |
| Komentar | `POST /posts/{id}/comments` (L24) | `notify(db, post.author_id, "comment", "Komentar baru di postingan Anda", ..., actor_id=user.id)` |
| Lamaran instruktur disetujui/ditolak | admin review (L20) | `notify(db, app.user_id, "instructor", "Lamaran instruktur diterima/ditolak", link="/studio")` |
| Course diajukan/terbit/ditolak | L30 | (dipasang di Langkah 30) |

## 29.4 Endpoint — `app/modules/notifications/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.pagination import PageParams, page_params, paginated
from app.modules.notifications.models import Notification

router = APIRouter(tags=["notifications"])

def _ser(n):
    actor = None
    if n.actor:
        actor = {"username": n.actor.username, "avatar_url": n.actor.avatar_url,
                 "type": "org" if n.actor.account_type == "organization" else "user"}
    return {"id": n.id, "type": n.type, "title": n.title, "body": n.body, "link": n.link,
            "actor": actor, "read": n.read, "created_at": n.created_at}

@router.get("/me/notifications")
async def list_notifications(unread: bool = False, p: PageParams = Depends(page_params),
                             user=Depends(get_current_user), db=Depends(get_db)):
    stmt = select(Notification).where(Notification.user_id == user.id)
    if unread:
        stmt = stmt.where(Notification.read == False)
    stmt = stmt.order_by(Notification.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_ser(n) for n in rows], total, p)

@router.get("/me/notifications/unread-count")
async def unread_count(user=Depends(get_current_user), db=Depends(get_db)):
    c = (await db.execute(select(func.count()).select_from(Notification).where(
        Notification.user_id == user.id, Notification.read == False))).scalar_one()
    return {"count": c}

@router.post("/me/notifications/{nid}/read")
async def mark_read(nid: str, user=Depends(get_current_user), db=Depends(get_db)):
    n = (await db.execute(select(Notification).where(
        Notification.id == nid, Notification.user_id == user.id))).scalar_one_or_none()
    if n: n.read = True; await db.commit()
    return {"ok": True}

@router.post("/me/notifications/read-all")
async def mark_all(user=Depends(get_current_user), db=Depends(get_db)):
    rows = (await db.execute(select(Notification).where(
        Notification.user_id == user.id, Notification.read == False))).scalars().all()
    for n in rows: n.read = True
    await db.commit()
    return {"ok": True}
```

Wire router di `main.py`.

## 29.5 Pembaruan Kontrak (Bagian 8)

- Entitas `Notification { id, type, title, body, link, actor: {username,avatar_url,type}|null, read, created_at }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/me/notifications?unread=` | ✓ | paginated |
| GET | `/me/notifications/unread-count` | ✓ | `{ count }` |
| POST | `/me/notifications/{id}/read` | ✓ | tandai dibaca |
| POST | `/me/notifications/read-all` | ✓ | tandai semua |

## Selesai bila

- [ ] Aksi (follow, suka/komentar postingan, lamaran instruktur) membuat notifikasi untuk penerima yang tepat.
- [ ] `unread-count` akurat; tandai dibaca / semua dibaca berfungsi.
- [ ] Notifikasi tidak dibuat untuk aksi pada diri sendiri.
- [ ] Notifikasi staf (humas) terbentuk untuk kejadian yang menuju mereka.
