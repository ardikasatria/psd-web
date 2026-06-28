# Langkah 33 — Manajemen Kategori Universal

> **Tujuan:** Kategori utama (dibuat staf) + subkategori (ditambah pengguna, harus unik) yang berlaku untuk **semua aset & fitur** (model/dataset/proyek, notebook, course, kompetisi, event). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 5, 27 (roles).

## 33.1 Model — `app/modules/categories/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class Category(Base):
    __tablename__ = "categories"
    # subkategori unik dalam induknya; kategori utama dijaga unik di kode (parent_id NULL)
    __table_args__ = (UniqueConstraint("parent_id", "slug", name="uq_category_parent_slug"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"cat_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    parent_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)  # NULL = utama
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "categories"
docker compose exec backend alembic upgrade head
```

## 33.2 Helper — `app/modules/categories/util.py`

```python
import re

def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")
    return s or "kategori"
```

## 33.3 Endpoint publik & subkategori pengguna — `app/modules/categories/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import get_current_user, require_staff
from app.core.errors import ApiError
from app.modules.categories.models import Category
from app.modules.categories.util import slugify

router = APIRouter(tags=["categories"])

@router.get("/categories")
async def list_main(db=Depends(get_db)):
    mains = (await db.execute(select(Category).where(Category.parent_id.is_(None))
             .order_by(Category.name))).scalars().all()
    out = []
    for m in mains:
        sub = (await db.execute(select(func.count()).select_from(Category).where(
            Category.parent_id == m.id))).scalar_one()
        out.append({"slug": m.slug, "name": m.name, "description": m.description, "subcategory_count": sub})
    return out

@router.get("/categories/{slug}")
async def get_category(slug: str, db=Depends(get_db)):
    m = (await db.execute(select(Category).where(Category.slug == slug, Category.parent_id.is_(None)))).scalar_one_or_none()
    if not m: raise ApiError(404, "not_found", "Kategori tidak ditemukan")
    subs = (await db.execute(select(Category).where(Category.parent_id == m.id).order_by(Category.name))).scalars().all()
    return {"slug": m.slug, "name": m.name, "description": m.description,
            "subcategories": [{"slug": s.slug, "name": s.name} for s in subs]}

@router.post("/categories/{slug}/subcategories", status_code=201)
async def add_subcategory(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    parent = (await db.execute(select(Category).where(Category.slug == slug, Category.parent_id.is_(None)))).scalar_one_or_none()
    if not parent: raise ApiError(404, "not_found", "Kategori utama tidak ditemukan")
    name = body["name"].strip()
    sub_slug = slugify(name)
    dup = (await db.execute(select(Category).where(
        Category.parent_id == parent.id, Category.slug == sub_slug))).scalar_one_or_none()
    if dup:
        raise ApiError(409, "subcategory_exists", f"Subkategori '{dup.name}' sudah ada di {parent.name}")
    c = Category(slug=sub_slug, name=name, parent_id=parent.id, created_by=user.id)
    db.add(c); await db.commit()
    return {"slug": c.slug, "name": c.name, "parent": parent.slug}
```

## 33.4 Endpoint staf (kelola utama & moderasi sub)

```python
@router.post("/admin/categories", status_code=201, dependencies=[Depends(require_staff)])
async def create_main(body: dict, db=Depends(get_db)):
    s = slugify(body["name"])
    if (await db.execute(select(Category).where(Category.slug == s, Category.parent_id.is_(None)))).scalar_one_or_none():
        raise ApiError(409, "exists", "Kategori utama sudah ada")
    c = Category(slug=s, name=body["name"].strip(), description=body.get("description", ""), parent_id=None)
    db.add(c); await db.commit()
    return {"slug": c.slug}

@router.patch("/admin/categories/{slug}", dependencies=[Depends(require_staff)])
async def update_main(slug: str, body: dict, db=Depends(get_db)):
    c = (await db.execute(select(Category).where(Category.slug == slug, Category.parent_id.is_(None)))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Kategori tidak ditemukan")
    if "name" in body: c.name = body["name"].strip()
    if "description" in body: c.description = body["description"]
    await db.commit(); return {"slug": c.slug}

@router.delete("/admin/categories/{slug}", status_code=204, dependencies=[Depends(require_staff)])
async def delete_category(slug: str, db=Depends(get_db)):
    c = (await db.execute(select(Category).where(Category.slug == slug))).scalar_one_or_none()
    if c:
        # hapus subkategori juga (atau tolak bila masih dipakai — pilih sesuai kebijakan)
        await db.execute(Category.__table__.delete().where(Category.parent_id == c.id))
        await db.delete(c); await db.commit()
```

Wire router di `main.py`.

## 33.5 Lampirkan ke aset (pola universal)

Tambah ke **tiap** entitas yang dikategorikan (`Repo`, `Notebook`, `Course`, `Competition`, `Event`):

```python
category_id:    Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
```

Migrasi lagi (autogenerate) setelah menambah kolom di semua model.

Validasi & set saat create/patch (contoh untuk Repo, replikasi ke lainnya):

```python
async def _resolve_category(db, category_slug, subcategory_slug):
    cat = sub = None
    if category_slug:
        cat = (await db.execute(select(Category).where(Category.slug == category_slug, Category.parent_id.is_(None)))).scalar_one_or_none()
        if not cat: raise ApiError(422, "bad_category", "Kategori tidak dikenal")
    if subcategory_slug:
        sub = (await db.execute(select(Category).where(Category.slug == subcategory_slug))).scalar_one_or_none()
        if not sub or (cat and sub.parent_id != cat.id):
            raise ApiError(422, "bad_subcategory", "Subkategori tidak cocok dengan kategori")
    return (cat.id if cat else None), (sub.id if sub else None)
```

Pada `create`/`update` Repo (Langkah 5/15): terima `category` & `subcategory` (slug), set `category_id`/`subcategory_id`. Sertakan objek `category`/`subcategory` `{slug,name}` di `to_summary`/`to_detail`.

> Lakukan hal sama untuk Notebook (L22), Course (L20), Competition (L6/admin), Event (L6/admin). Course/Competition/Event diisi oleh staf/instruktur; Repo/Notebook oleh pemilik.

## 33.6 Filter berdasarkan kategori

Pada endpoint daftar (mis. `GET /{kind}`, `/notebooks`, `/courses`, `/competitions`, `/events`): terima `category` & `subcategory` (slug) → resolve ke id → tambahkan `where(category_id == ...)` / `subcategory_id`. (Bila pakai Meilisearch, tambahkan `category_id`/`subcategory_id` ke filterable attributes.)

## 33.7 Pembaruan Kontrak (Bagian 8)

- Entitas `Category { slug, name, description?, subcategory_count? }`, subkategori `{ slug, name }`.
- Semua summary aset **+** `category: {slug,name}|null`, `subcategory: {slug,name}|null`. Create/patch menerima `category`, `subcategory` (slug). Daftar menerima query `category`, `subcategory`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/categories` | — | kategori utama + jumlah sub |
| GET | `/categories/{slug}` | — | + daftar subkategori |
| POST | `/categories/{slug}/subcategories` | ✓ | `{ name }`; `409 subcategory_exists` bila duplikat |
| POST/PATCH/DELETE | `/admin/categories[/{slug}]` | staf | kelola kategori utama |

## Selesai bila

- [ ] Staf membuat/ubah/hapus kategori utama; duplikat ditolak.
- [ ] Pengguna menambah subkategori; duplikat dalam induk yang sama → `409` dengan peringatan.
- [ ] Aset (Repo/Notebook/Course/Competition/Event) dapat diberi kategori+subkategori; subkategori divalidasi cocok induk.
- [ ] Daftar aset dapat difilter `?category=&subcategory=`.
- [ ] Summary/detail aset menyertakan kategori.
