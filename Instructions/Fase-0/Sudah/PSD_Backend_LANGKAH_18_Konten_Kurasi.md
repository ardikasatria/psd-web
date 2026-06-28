# Langkah 18 — Konten Awal & Kurasi (Akun Resmi, Featured, Pengumuman, Seed Nyata)

> **Tujuan:** Akun PSD resmi, penanda *featured* yang dikelola admin, banner pengumuman, dan konten benih nyata agar platform tidak kosong. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 12 (admin), 16 (discover), 8 (seed).

## 18.1 Field baru

`User` (`app/modules/users/models.py`):

```python
is_official: Mapped[bool] = mapped_column(Boolean, default=False)
```

`Repo`, `Competition`, `Event` (masing-masing model):

```python
featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "official and featured flags"
docker compose exec backend alembic upgrade head
```

- Sertakan `is_official` di `ProfileOut` dan di objek `owner` (`to_summary`, Langkah 5): `"is_official": r.owner.is_official`.
- Sertakan `featured` di summary masing-masing konten (opsional, untuk badge).

## 18.2 Model Pengumuman — `app/modules/announcements/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class Announcement(Base):
    __tablename__ = "announcements"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"ann_{uuid.uuid4().hex[:12]}")
    title: Mapped[str] = mapped_column(String)
    body_md: Mapped[str] = mapped_column(String, default="")
    level: Mapped[str] = mapped_column(String, default="info")     # info | penting
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi lagi (autogenerate) untuk tabel ini.

## 18.3 Endpoint publik

```python
# app/modules/announcements/router.py
from fastapi import APIRouter, Depends
from sqlalchemy import select
from app.core.db import get_db
from app.modules.announcements.models import Announcement

router = APIRouter(tags=["announcements"])

@router.get("/announcements")
async def list_active(db=Depends(get_db)):
    rows = (await db.execute(select(Announcement).where(Announcement.active == True)
            .order_by(Announcement.created_at.desc()))).scalars().all()
    return [{"id": a.id, "title": a.title, "body_md": a.body_md, "level": a.level} for a in rows]
```

Perbarui `GET /discover` (Langkah 16) agar **featured berbasis flag**:

```python
featured = select(Repo).where(Repo.visibility == "public", Repo.featured == True).order_by(Repo.updated_at.desc()).limit(6)
recent   = select(Repo).where(Repo.visibility == "public").order_by(Repo.updated_at.desc()).limit(6)
```

## 18.4 Admin: pengumuman + toggle featured

Tambah ke router admin (Langkah 12, sudah dijaga `require_admin`):

```python
from app.modules.announcements.models import Announcement

@router.post("/admin/announcements", status_code=201)
async def create_ann(body: dict, db=Depends(get_db)):
    a = Announcement(**body); db.add(a); await db.commit(); await db.refresh(a)
    return {"id": a.id}

@router.patch("/admin/announcements/{ann_id}")
async def update_ann(ann_id: str, body: dict, db=Depends(get_db)):
    a = (await db.execute(select(Announcement).where(Announcement.id == ann_id))).scalar_one_or_none()
    if not a: raise ApiError(404, "not_found", "Pengumuman tidak ditemukan")
    for k, v in body.items(): setattr(a, k, v)
    await db.commit(); return {"id": a.id}

@router.delete("/admin/announcements/{ann_id}", status_code=204)
async def delete_ann(ann_id: str, db=Depends(get_db)):
    a = (await db.execute(select(Announcement).where(Announcement.id == ann_id))).scalar_one_or_none()
    if a: await db.delete(a); await db.commit()
```

**Toggle featured** memakai endpoint admin yang sudah ada (`PATCH /admin/competitions/{slug}`, `/admin/events/{slug}`, `/admin/repos/{id}`) dengan body `{"featured": true|false}` — kolomnya kini tersedia. Pastikan PATCH pemilik aset (Langkah 15) **tidak** memasukkan `featured` (hanya admin yang boleh).

Wire router announcements di `main.py`.

## 18.5 Konten benih nyata — `app/seed_content.py`

Lebih kaya dari data demo Langkah 8; semua di bawah akun resmi **PSD**. Idempoten (upsert/replace). Contoh kerangka:

```python
# akun resmi
psd = User(id="usr_psd", username="psd", email="org@psd.id", name="Projek Sains Data",
           hashed_password=hash_password("demo"), role="org_admin", is_official=True)

# dataset terkurasi (Indonesia), tandai featured
Repo(kind="dataset", owner_id="usr_psd", name="ulasan-marketplace-id",
     slug="psd/ulasan-marketplace-id", description="200rb ulasan berbahasa Indonesia berlabel sentimen.",
     tags=["nlp", "sentimen", "bahasa-indonesia"], featured=True, readme_md="# Ulasan Marketplace ID\n...")
# + dataset bencana/pertanian, 1 model (IndoBERT-sentimen), 1 proyek contoh

# course + learning path pengantar
Course(slug="pengantar-sains-data", title="Pengantar Sains Data", level="pemula", ...)
LearningPath(slug="jalur-pemula", title="Jalur Pemula Sains Data", course_slugs=["pengantar-sains-data"])

# 1 kompetisi (featured) + 1 event Demo Day ITERA (featured)
Competition(slug="prediksi-permintaan-umkm", ..., featured=True)
Event(slug="demo-day-sains-data-itera", ..., featured=True)

# utas forum pembuka (repo_id null = forum umum), penulis psd
Thread(title="Selamat datang di PSD", author_id="usr_psd", body_md="...")
Thread(title="Pedoman Komunitas", author_id="usr_psd", body_md="...")
Thread(title="FAQ", author_id="usr_psd", body_md="...")

# pengumuman pembuka
Announcement(title="Pendaftaran Demo Day ITERA dibuka", body_md="...", level="penting", active=True)
```

Jalankan:

```bash
docker compose exec backend python -m app.seed_content
docker compose exec backend python -m app.reindex     # agar konten benih masuk pencarian
```

## 18.6 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- `OwnerRef` **+** `is_official?: boolean`; Profil **+** `is_official`. Summary konten **+** `featured?: boolean`.
- Entitas `Announcement { id, title, body_md, level: "info"|"penting" }`.

| Metode | Path | Auth | Body | Respons |
|---|---|---|---|---|
| GET | `/announcements` | — | — | `Announcement[]` (aktif) |
| POST | `/admin/announcements` | admin | `{ title, body_md, level, active }` | `{ id }` |
| PATCH | `/admin/announcements/{id}` | admin | sebagian field | `{ id }` |
| DELETE | `/admin/announcements/{id}` | admin | — | 204 |

`/discover` kini memakai flag `featured`. Toggle featured via `PATCH /admin/{competitions|events|repos}/...` dengan `{ featured }`.

## Selesai bila

- [ ] Akun `psd` ber-`is_official=true`; muncul di profil & owner kartu.
- [ ] Admin dapat menandai aset/kompetisi/event sebagai featured; muncul di `/discover`.
- [ ] `GET /announcements` mengembalikan pengumuman aktif; admin bisa CRUD.
- [ ] `seed_content` mengisi konten nyata; `reindex` membuatnya tercari.
- [ ] PATCH pemilik aset tidak bisa mengubah `featured` (admin-only).
