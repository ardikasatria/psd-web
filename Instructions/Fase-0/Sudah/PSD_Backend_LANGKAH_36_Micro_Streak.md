# Langkah 36 — Micro-learning & Streak (Lembut)

> **Tujuan:** Unit belajar bite-sized harian + streak lembut (toleran, berbasis target mingguan) agar belajar jadi kebiasaan. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 20/31 (lesson/quiz), 25 (gamifikasi), 33 (kategori), 35 (minat, opsional).

## 36.1 Model — `app/modules/micro/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Boolean, JSON, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class MicroLesson(Base):
    __tablename__ = "micro_lessons"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"mic_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    content_md: Mapped[str] = mapped_column(String, default="")
    duration_min: Mapped[int] = mapped_column(Integer, default=5)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    quiz: Mapped[list] = mapped_column(JSON, default=list)     # [{id,question,options,answer_index,explanation}]
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class MicroCompletion(Base):
    __tablename__ = "micro_completions"
    __table_args__ = (UniqueConstraint("user_id", "micro_id", name="uq_micro_done"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"mcd_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    micro_id: Mapped[str] = mapped_column(ForeignKey("micro_lessons.id"), index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "micro learning"
docker compose exec backend alembic upgrade head
```

## 36.2 Daily, detail, complete — `app/modules/micro/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.modules.micro.models import MicroLesson, MicroCompletion
from app.modules.gamification.service import award_reputation, award_badge

router = APIRouter(tags=["micro"])

def _public(m):   # sembunyikan kunci quiz
    quiz = [{"id": q["id"], "question": q["question"], "options": q["options"]} for q in (m.quiz or [])]
    return {"slug": m.slug, "title": m.title, "content_md": m.content_md,
            "duration_min": m.duration_min, "quiz": quiz, "has_quiz": bool(m.quiz)}

@router.get("/micro/daily")
async def daily(user=Depends(get_current_user), db=Depends(get_db)):
    done = {c.micro_id for c in (await db.execute(select(MicroCompletion).where(
        MicroCompletion.user_id == user.id))).scalars().all()}
    q = select(MicroLesson).where(MicroLesson.active == True)
    if user.interests:                       # prioritaskan minat (opsional)
        pass                                  # bisa filter kategori sesuai minat bila dipetakan
    rows = (await db.execute(q.order_by(MicroLesson.created_at.desc()).limit(20))).scalars().all()
    todo = [m for m in rows if m.id not in done][:5]
    return {"items": [{"slug": m.slug, "title": m.title, "duration_min": m.duration_min,
                       "has_quiz": bool(m.quiz)} for m in todo]}

@router.get("/micro/{slug}")
async def get_micro(slug: str, db=Depends(get_db)):
    m = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if not m: raise ApiError(404, "not_found", "Micro-lesson tidak ditemukan")
    return _public(m)

@router.post("/micro/{slug}/complete")
async def complete(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    m = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if not m: raise ApiError(404, "not_found", "Micro-lesson tidak ditemukan")
    result = None
    if m.quiz:                                # nilai quiz singkat
        answers = body.get("answers", [])
        correct = sum(1 for q, a in zip(m.quiz, answers) if q.get("answer_index") == a)
        result = {"score": round(correct / len(m.quiz) * 100), "correct": correct, "total": len(m.quiz),
                  "review": [{"id": q["id"], "correct_index": q.get("answer_index"), "explanation": q.get("explanation")} for q in m.quiz]}
    first = not (await db.execute(select(MicroCompletion).where(
        MicroCompletion.user_id == user.id, MicroCompletion.micro_id == m.id))).scalar_one_or_none()
    if first:
        db.add(MicroCompletion(user_id=user.id, micro_id=m.id)); await db.commit()
        await award_reputation(db, user, "micro_completed", points=1)
        # badge streak dicek di /me/streak atau di sini bila ingin segera
    return {"completed": True, "quiz": result}
```

> Tambahkan `"micro_completed": 1` ke `POINTS` (Langkah 25) dan badge `"konsisten"` (silver, "Streak 7 hari") ke `BADGES`.

## 36.3 Streak lembut — `app/modules/micro/router.py`

Dihitung dari hari aktif belajar (lesson course **dan** micro), toleran satu hari:

```python
from datetime import date, timedelta, datetime, timezone
from app.modules.learn.models import LessonProgress

@router.get("/me/streak")
async def streak(user=Depends(get_current_user), db=Depends(get_db)):
    l = (await db.execute(select(LessonProgress.completed_at).where(LessonProgress.user_id == user.id))).scalars().all()
    m = (await db.execute(select(MicroCompletion.completed_at).where(MicroCompletion.user_id == user.id))).scalars().all()
    days = sorted({d.astimezone(timezone.utc).date() for d in (list(l) + list(m)) if d})
    dayset = set(days)
    today = datetime.now(timezone.utc).date()

    active_today = today in dayset
    # GRACE: streak masih hidup bila aktif hari ini ATAU kemarin
    anchor = today if active_today else (today - timedelta(days=1) if (today - timedelta(days=1)) in dayset else None)
    current = 0
    if anchor:
        d = anchor
        while d in dayset:
            current += 1; d -= timedelta(days=1)

    longest = 0; run = 0; prev = None
    for d in days:
        run = run + 1 if (prev and d - prev == timedelta(days=1)) else 1
        longest = max(longest, run); prev = d

    monday = today - timedelta(days=today.weekday())
    weekly_done = sum(1 for d in dayset if d >= monday)
    weekly_goal = 4   # target lembut

    if current >= 7:
        await award_badge(db, user.id, "konsisten")

    return {"current_streak": current, "longest_streak": longest, "active_today": active_today,
            "weekly_done": weekly_done, "weekly_goal": weekly_goal,
            "calendar": [{"date": str(today - timedelta(days=i)), "active": (today - timedelta(days=i)) in dayset}
                         for i in range(29, -1, -1)]}
```

## 36.4 Kurasi (staf) — kelola micro-lesson

```python
@router.post("/admin/micro", status_code=201, dependencies=[Depends(require_staff)])
async def create_micro(body: dict, db=Depends(get_db)):
    if (await db.execute(select(MicroLesson).where(MicroLesson.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug sudah ada")
    db.add(MicroLesson(slug=body["slug"], title=body["title"], content_md=body.get("content_md", ""),
                       duration_min=body.get("duration_min", 5), category_id=body.get("category_id"),
                       quiz=body.get("quiz", [])))
    await db.commit(); return {"slug": body["slug"]}

@router.patch("/admin/micro/{slug}", dependencies=[Depends(require_staff)])
async def update_micro(slug: str, body: dict, db=Depends(get_db)):
    m = (await db.execute(select(MicroLesson).where(MicroLesson.slug == slug))).scalar_one_or_none()
    if not m: raise ApiError(404, "not_found", "Tidak ditemukan")
    for k in ("title", "content_md", "duration_min", "category_id", "quiz", "active"):
        if k in body: setattr(m, k, body[k])
    await db.commit(); return {"slug": m.slug}
```

Wire router di `main.py`.

## 36.5 Pembaruan Kontrak (Bagian 8)

- Entitas `MicroLesson { slug, title, content_md, duration_min, quiz:[{id,question,options}], has_quiz }` (kunci tersembunyi).
- `Streak { current_streak, longest_streak, active_today, weekly_done, weekly_goal, calendar:[{date,active}] }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/micro/daily` | ✓ | beberapa micro belum selesai |
| GET | `/micro/{slug}` | — | detail (kunci tersembunyi) |
| POST | `/micro/{slug}/complete` | ✓ | `{ answers? }` → selesai + skor |
| GET | `/me/streak` | ✓ | streak + kalender 30 hari |
| POST/PATCH | `/admin/micro[/{slug}]` | staf | kelola |

## Selesai bila

- [ ] `/micro/daily` menyajikan unit belajar singkat yang belum diselesaikan.
- [ ] Menyelesaikan micro (dengan/atau tanpa quiz) tercatat & memberi reputasi kecil.
- [ ] Streak **toleran**: tidak putus saat melewatkan satu hari; pecah hanya setelah dua hari tak aktif.
- [ ] Target mingguan & kalender 30 hari benar; badge "konsisten" pada streak 7 hari.
- [ ] Staf dapat mengkurasi micro-lesson.
