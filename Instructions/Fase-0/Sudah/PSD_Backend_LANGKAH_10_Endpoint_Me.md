# Langkah 10 — Endpoint `/me/*` (Submission saya & Event saya)

> **Tujuan:** Dua endpoint ber-auth yang mengembalikan submission dan registrasi event milik pengguna yang sedang login, lintas semua kompetisi/event. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 6 (Kompetisi & Event) selesai.
>
> **Tidak ada model/migrasi baru** — endpoint ini merangkai tabel yang sudah ada (`submissions`↔`competitions`, `event_registrations`↔`events`).

## 10.1 Router — `app/modules/me/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.pagination import PageParams, page_params, paginated
from app.modules.users.models import User
from app.modules.competitions.models import Submission, Competition
from app.modules.events.models import Event, EventRegistration

router = APIRouter(tags=["me"])


@router.get("/me/submissions")
async def my_submissions(user: User = Depends(get_current_user),
                         p: PageParams = Depends(page_params),
                         db: AsyncSession = Depends(get_db)):
    base = (select(Submission, Competition)
            .join(Competition, Submission.competition_id == Competition.id)
            .where(Submission.user_id == user.id)
            .order_by(Submission.created_at.desc()))
    total = (await db.execute(
        select(func.count()).select_from(Submission).where(Submission.user_id == user.id)
    )).scalar_one()
    rows = (await db.execute(base.offset(p.offset).limit(p.page_size))).all()
    items = [{
        "id": s.id, "created_at": s.created_at, "status": s.status,
        "public_score": s.public_score, "filename": s.filename,
        "competition": {"slug": c.slug, "title": c.title},
    } for s, c in rows]
    return paginated(items, total, p)


@router.get("/me/events")
async def my_events(user: User = Depends(get_current_user),
                    p: PageParams = Depends(page_params),
                    db: AsyncSession = Depends(get_db)):
    base = (select(EventRegistration, Event)
            .join(Event, EventRegistration.event_id == Event.id)
            .where(EventRegistration.user_id == user.id)
            .order_by(Event.starts_at.asc()))
    total = (await db.execute(
        select(func.count()).select_from(EventRegistration).where(EventRegistration.user_id == user.id)
    )).scalar_one()
    rows = (await db.execute(base.offset(p.offset).limit(p.page_size))).all()
    items = [{
        "registration_id": r.id, "status": r.status,
        "event": {"slug": e.slug, "title": e.title, "type": e.type, "mode": e.mode,
                  "starts_at": e.starts_at, "ends_at": e.ends_at,
                  "location": e.location, "cover_url": e.cover_url},
    } for r, e in rows]
    return paginated(items, total, p)
```

## 10.2 Wire ke `app/main.py`

```python
from app.modules.me.router import router as me_router
app.include_router(me_router, prefix=settings.API_PREFIX)
```

> Tidak ada `alembic revision` — tidak ada tabel baru.

## 10.3 Uji cepat

```bash
TOKEN=...  # dari /auth/login
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/me/submissions
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/me/events
```

## 10.4 Pembaruan Kontrak (tambahkan ke Bagian 8 dokumen frontend)

**Entitas baru:**

```ts
MySubmission {
  id; created_at; status: "queued" | "scored" | "failed";
  public_score: number | null; filename;
  competition: { slug: string; title: string }
}

MyEventRegistration {
  registration_id; status: "registered" | "waitlisted";
  event: { slug; title; type; mode: "daring" | "luring";
           starts_at; ends_at; location: string | null; cover_url: string | null }
}
```

**Endpoint baru:**

| Metode | Path | Auth | Query | Respons |
|---|---|---|---|---|
| GET | `/me/submissions` | ✓ | `page, page_size` | `Paginated<MySubmission>` |
| GET | `/me/events` | ✓ | `page, page_size` | `Paginated<MyEventRegistration>` |

> Setelah kontrak diperbarui, perbarui pula **mock (MSW) dan skema Zod** di frontend — dirinci di file *PSD_Frontend_Dashboard_Widget_Me.md* agar mode mock tetap bekerja.

## Selesai bila

- [ ] `GET /api/v1/me/submissions` (ber-auth) → `Paginated<MySubmission>`, terurut terbaru, hanya milik pengguna.
- [ ] `GET /api/v1/me/events` (ber-auth) → `Paginated<MyEventRegistration>`, hanya milik pengguna.
- [ ] Tanpa token → `401` dengan amplop error standar.
- [ ] Tidak ada migrasi baru yang dibuat.
- [ ] Kontrak Bagian 8 diperbarui dengan dua entitas & dua endpoint di atas.
