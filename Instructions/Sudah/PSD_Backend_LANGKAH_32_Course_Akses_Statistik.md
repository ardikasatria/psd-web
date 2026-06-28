# Langkah 32 — Akses, Pembelajar & Statistik Course

> **Tujuan:** Akses lifetime vs terbatas waktu, gerbang konten per-enrollment, daftar pembelajar untuk instruktur, dan statistik di halaman course. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 20, 31.

## 32.1 Field

`Course` (`app/modules/learn/models.py`):

```python
access_type: Mapped[str] = mapped_column(String, default="lifetime")  # lifetime | limited
access_days: Mapped[int | None] = mapped_column(Integer, nullable=True)  # untuk limited
```

`Enrollment`:

```python
expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "course access window"
docker compose exec backend alembic upgrade head
```

## 32.2 Enrol dengan masa berlaku (ubah Langkah 20)

```python
from datetime import datetime, timezone, timedelta

@router.post("/courses/{slug}/enroll", status_code=201)
async def enroll(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug, Course.status == "published"))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Course tidak ditemukan")
    existing = (await db.execute(select(Enrollment).where(Enrollment.user_id == user.id,
                Enrollment.course_slug == slug))).scalar_one_or_none()
    expires = None
    if c.access_type == "limited" and c.access_days:
        expires = datetime.now(timezone.utc) + timedelta(days=c.access_days)
    if existing:                       # enrol ulang memperpanjang akses
        existing.expires_at = expires
    else:
        db.add(Enrollment(user_id=user.id, course_slug=slug, expires_at=expires))
    await db.commit()
    return {"enrolled": True, "expires_at": expires}
```

## 32.3 Gerbang akses — helper

```python
async def _active_enrollment(db, slug, user):
    if not user: return None
    e = (await db.execute(select(Enrollment).where(Enrollment.user_id == user.id,
         Enrollment.course_slug == slug))).scalar_one_or_none()
    if not e: return None
    if e.expires_at and e.expires_at < datetime.now(timezone.utc):
        return "expired"
    return e
```

Pakai di **quiz submit** (Langkah 31): tolak bila bukan enrollment aktif (`None`/`"expired"`).

## 32.4 Gerbang konten di detail course (ubah Langkah 31)

Hanya enrollee aktif / pemilik / staf yang melihat **isi** lesson; lainnya melihat struktur (terkunci):

```python
def _lesson_view(l, can_access, reveal_keys):
    out = {"id": l.get("id"), "title": l.get("title"), "type": l.get("type"),
           "duration_min": l.get("duration_min")}
    if can_access:
        out.update({"content_md": l.get("content_md"), "video_url": l.get("video_url"),
                    "materials": l.get("materials", [])})
        if l.get("quiz"):
            out["quiz"] = l["quiz"] if reveal_keys else \
                [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in l["quiz"]]
    else:
        out["locked"] = True
    return out
```

Di `GET /courses/{slug}`:

```python
enr = await _active_enrollment(db, slug, viewer)
is_owner_staff = viewer and (viewer.id == c.author_id or viewer.role in ("moderator", "superadmin"))
can_access = is_owner_staff or (enr not in (None, "expired"))
modules = [{**m, "lessons": [_lesson_view(l, can_access, is_owner_staff) for l in m.get("lessons", [])]}
           for m in (c.modules or [])]
# tambah ke respons:
"modules": modules, "access_type": c.access_type, "access_days": c.access_days,
"access_status": ("active" if enr not in (None, "expired") else ("expired" if enr == "expired" else "none")),
"stats": await _course_stats(db, c),
```

## 32.5 Statistik course

```python
from app.modules.learn.models import LessonProgress

async def _course_stats(db, c):
    total_lessons = sum(len(m.get("lessons", [])) for m in (c.modules or []))
    enrolled = (await db.execute(select(func.count()).select_from(Enrollment).where(
        Enrollment.course_slug == c.slug))).scalar_one()
    completed = 0
    if total_lessons:
        sub = (select(LessonProgress.user_id).where(LessonProgress.course_slug == c.slug)
               .group_by(LessonProgress.user_id)
               .having(func.count(LessonProgress.lesson_id) >= total_lessons)).subquery()
        completed = (await db.execute(select(func.count()).select_from(sub))).scalar_one()
    return {"enrolled": enrolled, "completed": completed, "lessons": total_lessons,
            "completion_rate": round(completed / enrolled * 100) if enrolled else 0}
```

## 32.6 Daftar pembelajar (instruktur/staf)

```python
@router.get("/courses/{slug}/learners")
async def learners(slug: str, p: PageParams = Depends(page_params),
                   user=Depends(get_current_user), db=Depends(get_db)):
    c = await _owned_course(db, slug, user)        # author atau staf (Langkah 31)
    total_lessons = sum(len(m.get("lessons", [])) for m in (c.modules or []))
    # progres per pengguna dalam satu query
    prog = dict((uid, n) for uid, n in (await db.execute(
        select(LessonProgress.user_id, func.count(LessonProgress.lesson_id))
        .where(LessonProgress.course_slug == slug).group_by(LessonProgress.user_id))).all())
    stmt = (select(Enrollment, User).join(User, Enrollment.user_id == User.id)
            .where(Enrollment.course_slug == slug).order_by(Enrollment.created_at.desc()))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    items = []
    for e, u in rows:
        done = prog.get(u.id, 0)
        items.append({"user": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url},
                      "enrolled_at": e.created_at, "expires_at": e.expires_at,
                      "completed": done, "total": total_lessons,
                      "percent": round(done / total_lessons * 100) if total_lessons else 0})
    return paginated(items, total, p)
```

## 32.7 `/me/learning` (ubah Langkah 20)

Tambahkan `expires_at` & `expired` per item agar pembelajar tahu sisa akses.

## 32.8 Pembaruan Kontrak (Bagian 8)

- `CourseDetail` **+** `access_type`, `access_days`, `access_status` (none|active|expired), `stats {enrolled,completed,lessons,completion_rate}`; lesson terkunci → `locked: true` tanpa isi.
- `enroll` respons **+** `expires_at`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/courses/{slug}/learners` | pemilik/staf | daftar pembelajar + progres |

## Selesai bila

- [ ] Course bisa lifetime atau terbatas (`access_days`); enrol mengisi `expires_at`.
- [ ] Enrollee kedaluwarsa kehilangan akses isi lesson & quiz (terkunci); enrol ulang memperpanjang.
- [ ] Non-enrollee melihat struktur (terkunci) + CTA enrol; isi hanya untuk enrollee aktif/pemilik/staf.
- [ ] Statistik (terdaftar, selesai, tingkat penyelesaian, durasi) muncul di detail.
- [ ] Instruktur/staf melihat daftar pembelajar beserta progresnya.
