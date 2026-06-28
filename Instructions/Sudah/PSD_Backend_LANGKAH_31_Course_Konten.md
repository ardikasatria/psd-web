# Langkah 31 — Struktur & Isi Course (Topik, Lesson, Materi, Quiz)

> **Tujuan:** Membentuk isi course: topik (modul), lesson kaya (bacaan/video/quiz), **materi yang diunggah**, **quiz dengan penilaian** (kunci tersembunyi dari pembelajar), serta deskripsi, syarat, dan durasi. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 20 (LMS), 30 (publish workflow), 13 (storage).

## 31.1 Struktur data lesson (di dalam `Course.modules` JSON)

Modul = topik. Tiap lesson kini:

```jsonc
{
  "id": "l1", "title": "Apa itu Big Data", "type": "reading",   // reading | video | quiz
  "duration_min": 12,
  "content_md": "...",            // untuk reading
  "video_url": null,              // untuk video
  "materials": [ { "name": "slide.pdf", "url": "...", "size_bytes": 12345, "type": "application/pdf" } ],
  "quiz": [ { "id": "q1", "question": "...", "options": ["A","B","C"], "answer_index": 1, "explanation": "..." } ]
}
```

> `answer_index` & `explanation` **tidak** dikirim ke pembelajar (lihat 31.4).

## 31.2 Field course — `app/modules/learn/models.py`

```python
requirements_md: Mapped[str | None] = mapped_column(String, nullable=True)   # syarat/prasyarat
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "course requirements"
docker compose exec backend alembic upgrade head
```

Durasi total dihitung dari lessons (tak perlu kolom).

## 31.3 Unggah materi — `app/modules/learn/router.py`

```python
import uuid
from fastapi import UploadFile, File
from app.core.storage import upload_asset      # bucket psd-assets (Langkah 15)
from app.core.deps import get_current_user

async def _owned_course(db, slug, user):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Course tidak ditemukan")
    if c.author_id != user.id and user.role not in ("moderator", "superadmin"):
        raise ApiError(403, "forbidden", "Bukan pemilik course")
    return c

@router.post("/courses/{slug}/materials", status_code=201)
async def upload_material(slug: str, file: UploadFile = File(...),
                          user=Depends(get_current_user), db=Depends(get_db)):
    c = await _owned_course(db, slug, user)
    data = await file.read()
    if len(data) > 50 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maks 50 MB")
    name = file.filename or f"materi-{uuid.uuid4().hex}"
    url = upload_asset(f"courses/{slug}/{uuid.uuid4().hex}-{name}", data,
                       file.content_type or "application/octet-stream")
    return {"name": name, "url": url, "size_bytes": len(data),
            "type": file.content_type or "application/octet-stream"}
```

Instruktur menambahkan objek hasil ini ke `materials` lesson lewat `PATCH /courses/{slug}` (mengirim `modules` yang sudah diperbarui).

## 31.4 Sajikan course tanpa membocorkan kunci quiz

Helper:

```python
def _public_modules(modules):
    out = []
    for m in modules or []:
        lessons = []
        for l in m.get("lessons", []):
            l2 = {**l}
            if l2.get("quiz"):
                l2["quiz"] = [{"id": q["id"], "question": q["question"], "options": q["options"]}
                              for q in l2["quiz"]]      # buang answer_index & explanation
            lessons.append(l2)
        out.append({**m, "lessons": lessons})
    return out

def _total_minutes(modules):
    return sum(l.get("duration_min", 0) for m in (modules or []) for l in m.get("lessons", []))
```

Ubah `GET /courses/{slug}` (Langkah 20/30) — reveal kunci hanya untuk pemilik/staf:

```python
reveal = viewer and (viewer.id == c.author_id or viewer.role in ("moderator", "superadmin"))
modules = c.modules if reveal else _public_modules(c.modules)
# tambahkan ke respons:
"modules": modules, "requirements_md": c.requirements_md,
"total_duration_min": _total_minutes(c.modules),
```

## 31.5 Kerjakan & nilai quiz

```python
from app.modules.learn.models import Enrollment, LessonProgress

@router.post("/courses/{slug}/lessons/{lid}/quiz/submit")
async def submit_quiz(slug: str, lid: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Course tidak ditemukan")
    if not (await db.execute(select(Enrollment).where(Enrollment.user_id == user.id,
            Enrollment.course_slug == slug))).scalar_one_or_none():
        raise ApiError(403, "not_enrolled", "Daftar dulu untuk mengerjakan quiz")
    lesson = next((l for m in (c.modules or []) for l in m.get("lessons", []) if l.get("id") == lid), None)
    if not lesson or not lesson.get("quiz"):
        raise ApiError(404, "not_found", "Quiz tidak ditemukan")
    quiz = lesson["quiz"]
    answers = body.get("answers", [])           # daftar index pilihan
    correct = sum(1 for q, a in zip(quiz, answers) if q.get("answer_index") == a)
    total = len(quiz)
    score = round(correct / total * 100) if total else 0
    passed = score >= 60
    if passed and not (await db.execute(select(LessonProgress).where(
            LessonProgress.user_id == user.id, LessonProgress.course_slug == slug,
            LessonProgress.lesson_id == lid))).scalar_one_or_none():
        db.add(LessonProgress(user_id=user.id, course_slug=slug, lesson_id=lid)); await db.commit()
    # ungkap kunci & penjelasan SETELAH submit
    review = [{"id": q["id"], "correct_index": q.get("answer_index"), "explanation": q.get("explanation")} for q in quiz]
    return {"score": score, "correct": correct, "total": total, "passed": passed, "review": review}
```

## 31.6 Pembaruan Kontrak (Bagian 8)

- `lesson` **+** `type` (reading|video|quiz), `materials: [{name,url,size_bytes,type}]`, `quiz: [{id,question,options}]` (kunci disembunyikan untuk pembelajar; lengkap untuk pemilik/staf).
- `CourseDetail` **+** `requirements_md`, `total_duration_min`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST | `/courses/{slug}/materials` | pemilik/staf | multipart → `{name,url,size_bytes,type}` |
| POST | `/courses/{slug}/lessons/{lid}/quiz/submit` | terdaftar | `{ answers:[idx] }` → skor + review (kunci) |

## Selesai bila

- [ ] Lesson mendukung tipe bacaan/video/quiz; materi dapat diunggah & dilampirkan.
- [ ] `answer_index`/`explanation` **tidak** muncul di detail course untuk pembelajar; muncul untuk pemilik/staf.
- [ ] Submit quiz dinilai server-side; lulus (≥60) menandai lesson selesai; review (kunci) muncul setelah submit.
- [ ] Detail course menampilkan `requirements_md` & `total_duration_min`.
