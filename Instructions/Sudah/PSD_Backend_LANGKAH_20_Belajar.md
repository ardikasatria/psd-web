# Langkah 20 — Manajemen Belajar Lengkap (Instruktur, Authoring, Enrol, Progres)

> **Tujuan:** Pengguna mendaftar jadi instruktur (disetujui admin), instruktur/admin membuat & menerbitkan course, pengguna enrol dan progres lesson terlacak. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 7 (learn), 12 (admin).

## 20.1 Field & model

`User`: `is_instructor: Mapped[bool] = mapped_column(Boolean, default=False)`

`Course` (`app/modules/learn/models.py`) — tambah:

```python
author_id:    Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
status:       Mapped[str]        = mapped_column(String, default="draft", index=True)  # draft | published
published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
# modules[].lessons[] kini: { id, title, duration_min, content_md, video_url }
```

Model baru (`app/modules/learn/models.py`):

```python
class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_slug", name="uq_enroll"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"enr_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    course_slug: Mapped[str] = mapped_column(ForeignKey("courses.slug"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("user_id", "course_slug", "lesson_id", name="uq_progress"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"prg_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    course_slug: Mapped[str] = mapped_column(String, index=True)
    lesson_id: Mapped[str] = mapped_column(String)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Model instruktur (`app/modules/instructors/models.py`):

```python
class InstructorApplication(Base):
    __tablename__ = "instructor_applications"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ins_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    expertise: Mapped[str] = mapped_column(String)
    motivation_md: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="pending", index=True)  # pending|approved|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi (impor model baru di `alembic/env.py` lebih dulu):

```bash
docker compose exec backend alembic revision --autogenerate -m "learning management"
docker compose exec backend alembic upgrade head
```

## 20.2 Dependency instruktur — `app/core/deps.py`

```python
async def require_instructor(user: User = Depends(get_current_user)) -> User:
    if not (user.is_instructor or user.role == "admin"):
        raise ApiError(403, "forbidden", "Khusus instruktur")
    return user
```

## 20.3 Pendaftaran instruktur — `app/modules/instructors/router.py`

```python
router = APIRouter(tags=["instructors"])

@router.post("/me/instructor-application", status_code=201)
async def apply(body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    existing = (await db.execute(select(InstructorApplication).where(
        InstructorApplication.user_id == user.id,
        InstructorApplication.status.in_(["pending", "approved"])))).scalar_one_or_none()
    if existing:
        raise ApiError(409, "exists", "Anda sudah mengajukan atau sudah menjadi instruktur")
    a = InstructorApplication(user_id=user.id, expertise=body["expertise"],
                              motivation_md=body.get("motivation_md", ""))
    db.add(a); await db.commit(); await db.refresh(a)
    return {"id": a.id, "status": a.status}

@router.get("/me/instructor-application")
async def my_application(user=Depends(get_current_user), db=Depends(get_db)):
    a = (await db.execute(select(InstructorApplication).where(InstructorApplication.user_id == user.id)
         .order_by(InstructorApplication.created_at.desc()))).scalars().first()
    return {"status": a.status, "expertise": a.expertise} if a else None
```

Admin (tambah ke router admin, Langkah 12):

```python
@router.get("/admin/instructor-applications")
async def list_apps(status: str | None = None, p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(InstructorApplication, User).join(User, InstructorApplication.user_id == User.id)
    if status: stmt = stmt.where(InstructorApplication.status == status)
    stmt = stmt.order_by(InstructorApplication.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).all()
    return paginated([{"id": a.id, "expertise": a.expertise, "motivation_md": a.motivation_md,
                       "status": a.status, "user": {"username": u.username, "name": u.name}}
                      for a, u in rows], total, p)

@router.patch("/admin/instructor-applications/{app_id}")
async def review_app(app_id: str, body: dict, db=Depends(get_db)):
    a = (await db.execute(select(InstructorApplication).where(InstructorApplication.id == app_id))).scalar_one_or_none()
    if not a: raise ApiError(404, "not_found", "Pengajuan tidak ditemukan")
    a.status = body["status"]   # approved | rejected
    if a.status == "approved":
        u = (await db.execute(select(User).where(User.id == a.user_id))).scalar_one()
        u.is_instructor = True
    await db.commit()
    return {"status": a.status}
```

## 20.4 Authoring course — perluas `app/modules/learn/router.py`

```python
from app.core.deps import require_instructor, get_current_user, get_current_user_optional

@router.post("/courses", status_code=201)
async def create_course(body: dict, user=Depends(require_instructor), db=Depends(get_db)):
    if (await db.execute(select(Course).where(Course.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug course sudah dipakai")
    c = Course(slug=body["slug"], title=body["title"], level=body.get("level", "pemula"),
               description=body.get("description", ""), cover_url=body.get("cover_url"),
               modules=body.get("modules", []), author_id=user.id, status="draft")
    db.add(c); await db.commit()
    return {"slug": c.slug}

@router.patch("/courses/{slug}")
async def edit_course(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Course tidak ditemukan")
    if c.author_id != user.id and user.role != "admin":
        raise ApiError(403, "forbidden", "Bukan pemilik course")
    for k in ("title", "level", "description", "cover_url", "modules", "status"):
        if k in body: setattr(c, k, body[k])
    if body.get("status") == "published" and not c.published_at:
        from datetime import datetime, timezone
        c.published_at = datetime.now(timezone.utc)
    await db.commit()
    return {"slug": c.slug}
```

Ubah `GET /courses` (list) → hanya `status == "published"`. Ubah `GET /courses/{slug}` → bila `draft`, hanya pemilik/admin; tambahkan `enrolled` (auth-opsional) dan kirim `modules` lengkap (dengan `content_md`, `video_url`). Tambah `GET /me/courses/authored` (instruktur → course miliknya, termasuk draft).

## 20.5 Enrol & progres — `app/modules/learn/router.py`

```python
@router.post("/courses/{slug}/enroll", status_code=201)
async def enroll(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug, Course.status == "published"))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Course tidak ditemukan")
    if not (await db.execute(select(Enrollment).where(
            Enrollment.user_id == user.id, Enrollment.course_slug == slug))).scalar_one_or_none():
        db.add(Enrollment(user_id=user.id, course_slug=slug)); await db.commit()
    return {"enrolled": True}

@router.post("/courses/{slug}/lessons/{lesson_id}/complete")
async def complete_lesson(slug: str, lesson_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    if not (await db.execute(select(LessonProgress).where(
            LessonProgress.user_id == user.id, LessonProgress.course_slug == slug,
            LessonProgress.lesson_id == lesson_id))).scalar_one_or_none():
        db.add(LessonProgress(user_id=user.id, course_slug=slug, lesson_id=lesson_id)); await db.commit()
    return {"ok": True}
```

`GET /me/learning` (di modul `me`) — menyalakan "Lanjutkan belajar":

```python
@router.get("/me/learning")
async def my_learning(user=Depends(get_current_user), db=Depends(get_db)):
    from app.modules.learn.models import Course, Enrollment, LessonProgress
    enrolls = (await db.execute(select(Enrollment).where(Enrollment.user_id == user.id))).scalars().all()
    out = []
    for e in enrolls:
        c = (await db.execute(select(Course).where(Course.slug == e.course_slug))).scalar_one_or_none()
        if not c: continue
        lessons = [l for m in (c.modules or []) for l in m.get("lessons", [])]
        done = {p.lesson_id for p in (await db.execute(select(LessonProgress).where(
            LessonProgress.user_id == user.id, LessonProgress.course_slug == c.slug))).scalars().all()}
        total = len(lessons)
        completed = sum(1 for l in lessons if l["id"] in done)
        nxt = next((l["id"] for l in lessons if l["id"] not in done), None)
        out.append({"course": {"slug": c.slug, "title": c.title, "cover_url": c.cover_url, "level": c.level},
                    "completed": completed, "total": total,
                    "percent": round(completed / total * 100) if total else 0, "next_lesson_id": nxt})
    return {"items": out}
```

Wire router instructors di `main.py`.

## 20.6 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- `CourseDetail` **+** `author?: OwnerRef`, `status`, `enrolled: boolean`; `lessons[]` **+** `content_md`, `video_url`. `GET /courses` hanya published.
- Entitas `InstructorApplication { id, expertise, motivation_md, status, user }`, `LearningProgress { course, completed, total, percent, next_lesson_id }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST | `/me/instructor-application` | ✓ | `{ expertise, motivation_md }` |
| GET | `/me/instructor-application` | ✓ | status pengajuan / null |
| GET | `/admin/instructor-applications` | admin | list (filter status) |
| PATCH | `/admin/instructor-applications/{id}` | admin | `{ status }` → approve set `is_instructor` |
| POST | `/courses` | instruktur | buat draft |
| PATCH | `/courses/{slug}` | pemilik/admin | edit & publish |
| GET | `/me/courses/authored` | instruktur | course saya (incl draft) |
| POST | `/courses/{slug}/enroll` | ✓ | enrol |
| POST | `/courses/{slug}/lessons/{id}/complete` | ✓ | tandai selesai |
| GET | `/me/learning` | ✓ | progres course saya |

## Selesai bila

- [ ] Pengguna dapat mengajukan jadi instruktur; admin approve → `is_instructor=true`.
- [ ] Instruktur/admin membuat course (draft) & menerbitkan; publik hanya melihat published.
- [ ] Enrol berfungsi; menandai lesson selesai memperbarui progres.
- [ ] `GET /me/learning` mengembalikan progres + `next_lesson_id` (untuk "Lanjutkan belajar").
- [ ] Non-pemilik tak bisa mengedit course; draft tak terlihat publik.
