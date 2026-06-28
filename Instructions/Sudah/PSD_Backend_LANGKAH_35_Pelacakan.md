# Langkah 35 — Pelacakan Kebiasaan (Logging Aktivitas)

> **Tujuan:** Mencatat aktivitas pengguna (lihat/cari/klik/aksi) sebagai data mentah untuk rekomendasi & AI asisten nanti, dengan menghormati privasi. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 23 (settings), 33 (kategori), 26 (rate limit).

> **Penting (privasi/UU PDP):** logging dihormati oleh setelan pengguna (`privacy.activity_tracking`) dan tercakup di Kebijakan Privasi (Langkah 26). Sediakan retensi data (lihat 35.6).

## 35.1 Model — `app/modules/activity/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class ActivityEvent(Base):
    __tablename__ = "activity_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"act_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String, nullable=True, index=True)   # untuk anonim
    action: Mapped[str] = mapped_column(String, index=True)        # view|search|click|enroll|like|follow|submit|publish|complete
    entity_type: Mapped[str | None] = mapped_column(String, nullable=True)  # repo|notebook|course|competition|event|post|category|search|page
    entity_id: Mapped[str | None] = mapped_column(String, nullable=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)         # {query, tags, kind, duration_ms, ...}
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "activity events"
docker compose exec backend alembic upgrade head
```

Tambahkan ke setelan default (Langkah 23) `privacy`: `"activity_tracking": True`.

## 35.2 Helper — `app/modules/activity/service.py`

```python
from app.modules.activity.models import ActivityEvent

async def log_activity(db, *, user_id=None, session_id=None, action, entity_type=None,
                       entity_id=None, category_id=None, meta=None, commit=True):
    db.add(ActivityEvent(user_id=user_id, session_id=session_id, action=action,
                         entity_type=entity_type, entity_id=entity_id,
                         category_id=category_id, meta=meta or {}))
    if commit:
        await db.commit()
```

## 35.3 Ingest dari klien — `app/modules/activity/router.py`

```python
from fastapi import APIRouter, Depends
from app.core.db import get_db
from app.core.deps import get_current_user_optional
from app.core.ratelimit import rate_limit
from app.modules.activity.models import ActivityEvent
from app.modules.users.settings import merged

router = APIRouter(tags=["activity"])

@router.post("/track", dependencies=[rate_limit("track", 120, 60)])
async def track(body: dict, user=Depends(get_current_user_optional), db=Depends(get_db)):
    # hormati setelan pengguna
    if user and not merged(user.settings)["privacy"]["activity_tracking"]:
        return {"ok": True, "stored": 0}
    session_id = body.get("session_id")
    events = body.get("events", [])[:50]      # batasi batch
    for e in events:
        db.add(ActivityEvent(
            user_id=user.id if user else None, session_id=None if user else session_id,
            action=e.get("action", "view"), entity_type=e.get("entity_type"),
            entity_id=e.get("entity_id"), category_id=e.get("category_id"), meta=e.get("meta", {})))
    await db.commit()
    return {"ok": True, "stored": len(events)}
```

> Endpoint ini auth-opsional: pengguna login → `user_id`; anonim → `session_id`. Jangan simpan PII di `meta`.

## 35.4 (Opsional) hook sisi server di aksi bernilai tinggi

Untuk sinyal kuat, panggil `log_activity` di endpoint yang sudah ada (di luar yang sudah punya tabel sendiri). Karena enroll/like/follow/submit sudah tercatat di tabel masing-masing, fokuskan logging klien pada **view/search/click** (sinyal terkaya untuk rekomendasi). Hook server bersifat opsional & inkremental.

## 35.5 Ringkasan minat (jembatan ke rekomendasi)

```python
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta
from app.core.deps import get_current_user
from app.modules.categories.models import Category

@router.get("/me/activity-summary")
async def activity_summary(user=Depends(get_current_user), db=Depends(get_db)):
    since = datetime.now(timezone.utc) - timedelta(days=30)
    base = ActivityEvent.user_id == user.id

    # afinitas kategori
    rows = (await db.execute(select(ActivityEvent.category_id, func.count())
            .where(base, ActivityEvent.created_at >= since, ActivityEvent.category_id.isnot(None))
            .group_by(ActivityEvent.category_id).order_by(func.count().desc()).limit(8))).all()
    cats = []
    for cid, n in rows:
        c = (await db.execute(select(Category).where(Category.id == cid))).scalar_one_or_none()
        if c: cats.append({"slug": c.slug, "name": c.name, "count": n})

    # afinitas tag (dari meta) — agregasi di Python
    evs = (await db.execute(select(ActivityEvent.meta).where(
        base, ActivityEvent.created_at >= since))).scalars().all()
    tagc = {}
    for m in evs:
        for t in (m or {}).get("tags", []):
            tagc[t] = tagc.get(t, 0) + 1
    top_tags = sorted(tagc.items(), key=lambda x: -x[1])[:10]

    # hitungan aksi
    acts = dict((a, n) for a, n in (await db.execute(select(ActivityEvent.action, func.count())
        .where(base, ActivityEvent.created_at >= since).group_by(ActivityEvent.action))).all())

    return {"top_categories": cats, "top_tags": [{"tag": t, "count": n} for t, n in top_tags],
            "actions": acts, "window_days": 30}
```

## 35.6 Retensi (privasi)

Skrip pembersih (jalankan via cron) menghapus event mentah lebih tua dari mis. 180 hari; agregat/ringkasan boleh disimpan lebih lama:

```python
# app/modules/activity/cleanup.py — hapus event > 180 hari
```

Cantumkan retensi ini di Kebijakan Privasi.

## 35.7 Pembaruan Kontrak (Bagian 8)

- Setelan `privacy` **+** `activity_tracking: boolean` (default true).

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST | `/track` | opsional | `{ session_id?, events:[{action,entity_type?,entity_id?,category_id?,meta?}] }` |
| GET | `/me/activity-summary` | ✓ | afinitas kategori/tag + hitungan aksi |

## Selesai bila

- [ ] `POST /track` menyimpan event batch; menghormati `activity_tracking` (off → tidak menyimpan event pengguna).
- [ ] Event terhubung ke kategori/entitas; anonim memakai `session_id`.
- [ ] `GET /me/activity-summary` mengembalikan afinitas kategori/tag & hitungan aksi.
- [ ] Skrip retensi tersedia; tidak ada PII di `meta`.
