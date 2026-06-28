# Langkah 21 — Event: Pendaftaran, Daftar Tunggu, Peserta & Ekspor Kalender

> **Tujuan:** Kelola pendaftaran (daftar/batal) dengan daftar tunggu otomatis, daftar peserta + check-in untuk admin, dan ekspor kalender (.ics). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 6 (event), 12 (admin).

## 21.1 Field tambahan — `app/modules/events/models.py`

`EventRegistration` tambah:

```python
attended:   Mapped[bool] = mapped_column(Boolean, default=False)
created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "event registration attended"
docker compose exec backend alembic upgrade head
```

## 21.2 Helper hitung & ICS — `app/modules/events/router.py`

```python
from datetime import datetime, timezone
from fastapi import Response

async def _registered_count(db, event_id) -> int:
    return (await db.execute(select(func.count()).select_from(EventRegistration).where(
        EventRegistration.event_id == event_id, EventRegistration.status == "registered"))).scalar_one()

def _ics_dt(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

def _esc(s: str) -> str:
    return (s or "").replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")

def build_ics(e) -> str:
    loc = e.location or ("Daring" if e.mode == "daring" else "")
    return "\r\n".join([
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//PSD//Event//ID", "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT", f"UID:{e.id}@psd.id", f"DTSTAMP:{_ics_dt(datetime.now(timezone.utc))}",
        f"DTSTART:{_ics_dt(e.starts_at)}", f"DTEND:{_ics_dt(e.ends_at)}",
        f"SUMMARY:{_esc(e.title)}", f"LOCATION:{_esc(loc)}",
        f"DESCRIPTION:{_esc((e.description_md or '')[:500])}",
        "END:VEVENT", "END:VCALENDAR",
    ])
```

## 21.3 Detail event dengan status pendaftaran saya

Ubah `GET /events/{slug}` agar memakai `get_current_user_optional` dan menambah `my_registration`, `registered`, `spots_left`:

```python
from app.core.deps import get_current_user_optional

@router.get("/events/{slug}")
async def get_event(slug: str, viewer: User | None = Depends(get_current_user_optional),
                    db: AsyncSession = Depends(get_db)):
    e = await _get(db, slug)
    registered = await _registered_count(db, e.id)
    mine = None
    if viewer:
        r = (await db.execute(select(EventRegistration).where(
            EventRegistration.event_id == e.id, EventRegistration.user_id == viewer.id))).scalar_one_or_none()
        mine = {"status": r.status} if r else None
    return {**{k: getattr(e, k) for k in SUMMARY}, "registered": registered,
            "spots_left": (None if e.capacity is None else max(0, e.capacity - registered)),
            "my_registration": mine, "description_md": e.description_md,
            "agenda": e.agenda, "speakers": e.speakers}
```

## 21.4 Daftar & batal (dengan promosi daftar tunggu)

```python
@router.post("/events/{slug}/register", status_code=201)
async def register_event(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    e = await _get(db, slug)
    if e.status == "past":
        raise ApiError(400, "closed", "Pendaftaran telah ditutup")
    existing = (await db.execute(select(EventRegistration).where(
        EventRegistration.event_id == e.id, EventRegistration.user_id == user.id))).scalar_one_or_none()
    if existing:
        return {"registration_id": existing.id, "status": existing.status}
    count = await _registered_count(db, e.id)
    status = "waitlisted" if (e.capacity is not None and count >= e.capacity) else "registered"
    reg = EventRegistration(event_id=e.id, user_id=user.id, status=status)
    db.add(reg); await db.commit(); await db.refresh(reg)
    return {"registration_id": reg.id, "status": reg.status}

@router.delete("/events/{slug}/register")
async def cancel_registration(slug: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    e = await _get(db, slug)
    reg = (await db.execute(select(EventRegistration).where(
        EventRegistration.event_id == e.id, EventRegistration.user_id == user.id))).scalar_one_or_none()
    if not reg:
        return {"ok": True}
    freed = reg.status == "registered"
    await db.delete(reg); await db.commit()
    if freed and e.capacity is not None:        # naikkan satu dari daftar tunggu
        nxt = (await db.execute(select(EventRegistration).where(
            EventRegistration.event_id == e.id, EventRegistration.status == "waitlisted")
            .order_by(EventRegistration.created_at.asc()))).scalars().first()
        if nxt:
            nxt.status = "registered"; await db.commit()
    return {"ok": True}
```

## 21.5 Ekspor kalender (.ics)

```python
@router.get("/events/{slug}/calendar.ics")
async def event_ics(slug: str, db: AsyncSession = Depends(get_db)):
    e = await _get(db, slug)
    return Response(content=build_ics(e), media_type="text/calendar",
                    headers={"Content-Disposition": f'attachment; filename="{slug}.ics"'})
```

## 21.6 Admin: daftar peserta & check-in (tambah ke router admin, Langkah 12)

```python
from app.modules.events.models import Event, EventRegistration

@router.get("/admin/events/{slug}/registrations")
async def event_registrations(slug: str, p: PageParams = Depends(page_params), db=Depends(get_db)):
    e = (await db.execute(select(Event).where(Event.slug == slug))).scalar_one_or_none()
    if not e: raise ApiError(404, "not_found", "Event tidak ditemukan")
    stmt = (select(EventRegistration, User).join(User, EventRegistration.user_id == User.id)
            .where(EventRegistration.event_id == e.id).order_by(EventRegistration.created_at.asc()))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    return paginated([{"id": r.id, "status": r.status, "attended": r.attended,
                       "user": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url}}
                      for r, u in rows], total, p)

@router.patch("/admin/events/{slug}/registrations/{reg_id}")
async def check_in(slug: str, reg_id: str, body: dict, db=Depends(get_db)):
    r = (await db.execute(select(EventRegistration).where(EventRegistration.id == reg_id))).scalar_one_or_none()
    if not r: raise ApiError(404, "not_found", "Pendaftaran tidak ditemukan")
    r.attended = bool(body.get("attended", True))
    await db.commit()
    return {"id": r.id, "attended": r.attended}
```

## 21.7 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- `EventDetail` **+** `registered: number`, `spots_left: number | null`, `my_registration: { status } | null`.
- `EventRegistration`/peserta **+** `attended: boolean`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| DELETE | `/events/{slug}/register` | ✓ | batal; naikkan daftar tunggu |
| GET | `/events/{slug}/calendar.ics` | — | berkas `text/calendar` |
| GET | `/admin/events/{slug}/registrations` | admin | daftar peserta |
| PATCH | `/admin/events/{slug}/registrations/{id}` | admin | `{ attended }` check-in |

`POST /events/{slug}/register` kini idempoten (kembalikan pendaftaran yang ada) & menolak event `past`.

## Selesai bila

- [ ] Daftar/batal berfungsi; kapasitas penuh → `waitlisted`; batal dari yang `registered` menaikkan satu dari daftar tunggu.
- [ ] Detail event menampilkan `spots_left` & `my_registration` akurat.
- [ ] `GET /events/{slug}/calendar.ics` mengunduh berkas yang valid (terbuka di Google/Apple Calendar).
- [ ] Admin dapat melihat daftar peserta & menandai kehadiran (check-in).
- [ ] Pendaftaran ganda tidak membuat baris duplikat; event `past` menolak pendaftaran.
