# Langkah 30 — Publish Course Dua Pihak (Instruktur ↔ Humas)

> **Tujuan:** Instruktur mengajukan course untuk ditinjau; humas memverifikasi & menerbitkan; instruktur diberi tahu; halaman course menampilkan **kolaborasi** (dibuat instruktur, diterbitkan PSD). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 20 (LMS), 27 (roles), 29 (notifikasi).

## 30.1 Field — `app/modules/learn/models.py`

`Course`:

```python
# status kini: draft | pending_review | published | rejected
publisher_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
review_note:  Mapped[str | None] = mapped_column(String, nullable=True)
publisher: Mapped["User"] = relationship(foreign_keys=[publisher_id], lazy="selectin")
```

Config: `PSD_OFFICIAL_USERNAME: str = "psd"`.

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "course review workflow"
docker compose exec backend alembic upgrade head
```

## 30.2 Cabut self-publish instruktur (ubah Langkah 20)

Pada `PATCH /courses/{slug}` (Langkah 20): **buang** kemampuan instruktur men-set `status`. Instruktur hanya boleh menyunting `draft`/`rejected`; transisi status lewat alur di bawah.

```python
# di edit_course: tolak perubahan status oleh non-staf
if "status" in body and user.role not in ("moderator", "superadmin"):
    body.pop("status")
if c.status == "pending_review" and user.role not in ("moderator", "superadmin"):
    raise ApiError(409, "locked", "Course sedang ditinjau, tidak bisa diubah")
```

## 30.3 Instruktur mengajukan review

```python
from app.modules.notifications.service import notify_staff

@router.post("/courses/{slug}/submit-review")
async def submit_review(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Course tidak ditemukan")
    if c.author_id != user.id and user.role not in ("moderator", "superadmin"):
        raise ApiError(403, "forbidden", "Bukan pemilik course")
    if c.status not in ("draft", "rejected"):
        raise ApiError(400, "invalid_state", "Hanya draft/ditolak yang bisa diajukan")
    c.status = "pending_review"; c.review_note = None
    await db.commit()
    await notify_staff(db, "course", f"Course menunggu review: {c.title}",
                       body=f"Diajukan oleh {user.username}", link="/admin/courses/review", actor_id=user.id)
    return {"status": c.status}
```

## 30.4 Humas meninjau & menerbitkan

```python
from datetime import datetime, timezone
from app.core.deps import require_staff
from app.modules.notifications.service import notify
from app.core.config import settings

@router.get("/admin/courses/review-queue", dependencies=[Depends(require_staff)])
async def review_queue(p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(Course).where(Course.status == "pending_review").order_by(Course.slug)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([{"slug": c.slug, "title": c.title, "level": c.level,
                       "author": {"username": c.author.username} if c.author else None} for c in rows], total, p)

@router.patch("/admin/courses/{slug}/review", dependencies=[Depends(require_staff)])
async def review_course(slug: str, body: dict, db=Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Course tidak ditemukan")
    if body["decision"] == "publish":
        c.status = "published"
        if not c.published_at: c.published_at = datetime.now(timezone.utc)
        psd = (await db.execute(select(User).where(User.username == settings.PSD_OFFICIAL_USERNAME))).scalar_one_or_none()
        c.publisher_id = psd.id if psd else None
        await db.commit()
        await notify(db, c.author_id, "course", f"Course Anda diterbitkan: {c.title}", link=f"/learn/{c.slug}")
    else:  # reject
        c.status = "rejected"; c.review_note = body.get("note", "")
        await db.commit()
        await notify(db, c.author_id, "course", f"Course perlu revisi: {c.title}",
                     body=c.review_note, link="/studio")
    return {"status": c.status}
```

## 30.5 Kolaborasi di detail course

`GET /courses/{slug}` (Langkah 20) tambahkan `author` (instruktur) & `publisher` (PSD):

```python
def _owner(u):
    return None if not u else {"username": u.username, "avatar_url": u.avatar_url,
        "type": "org" if u.account_type == "organization" else "user", "is_official": u.is_official}
# pada respons detail:
"author": _owner(c.author), "publisher": _owner(c.publisher), "status": c.status, "review_note": c.review_note,
```

`GET /courses` publik tetap hanya `status == "published"` (sudah). `GET /me/courses/authored` menampilkan semua status milik instruktur (termasuk `pending_review`/`rejected` + `review_note`).

## 30.6 Pembaruan Kontrak (Bagian 8)

- `Course.status` ∈ `draft|pending_review|published|rejected`; **+** `author`, `publisher` (OwnerRef|null), `review_note`.
- Instruktur **tidak** bisa men-set `published` via `PATCH /courses/{slug}`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST | `/courses/{slug}/submit-review` | instruktur pemilik | draft/rejected → pending_review |
| GET | `/admin/courses/review-queue` | staf | antrean tinjauan |
| PATCH | `/admin/courses/{slug}/review` | staf | `{ decision: "publish"\|"reject", note? }` |

## Selesai bila

- [ ] Instruktur dapat mengajukan (draft/rejected → pending_review); course terkunci saat ditinjau.
- [ ] Humas melihat antrean, menerbitkan (→ publisher = akun PSD) atau menolak (dengan catatan).
- [ ] Instruktur menerima notifikasi saat diterbitkan/ditolak; staf saat ada pengajuan.
- [ ] Detail course menampilkan kolaborasi: dibuat {author} · diterbitkan {publisher/PSD}.
- [ ] Instruktur tidak bisa menerbitkan sendiri.
