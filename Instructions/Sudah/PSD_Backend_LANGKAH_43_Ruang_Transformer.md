# Langkah 43 — Ruang Transformer: Koleksi Kurasi & Hub

> **Tujuan:** Etalase kurasi untuk menarik pengguna ekosistem Transformer — model **Koleksi** (daftar aset kurasi oleh staf) + **hub Transformer** yang mengagregasi aset kategori Transformer. **Kerjakan hanya langkah ini.** Prasyarat: Kategori (33), Repo/Notebook (5/15/22), Konten Kurasi (18, `require_staff`). Ini lapisan penemuan ringan, bukan sistem baru yang berat.

> **Catatan posisi jujur:** ini **bukan** mengejar paritas Hugging Face. Tujuannya satu pintu masuk yang rapi & berkonteks lokal untuk aset bertema Transformer (model/dataset/notebook), bukan menyaingi skala ekosistem global.

## 43.1 Model — `app/modules/collections/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Boolean, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class Collection(Base):
    __tablename__ = "collections"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"col_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    description_md: Mapped[str] = mapped_column(String, default="")
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))      # staf pembuat
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    items: Mapped[list] = mapped_column(JSON, default=list)            # [{type, slug|id}]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "collections"
docker compose exec backend alembic upgrade head
```

## 43.2 Resolusi item — `app/modules/collections/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import require_staff           # Langkah 18 (moderator/superadmin)
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.categories.util import slugify
from app.modules.categories.models import Category
from app.modules.collections.models import Collection
from app.modules.repos.models import Repo
from app.modules.learn.models import Notebook

router = APIRouter(tags=["collections"])

async def _resolve_items(db, items):
    out = []
    for it in items or []:
        t = it.get("type")
        if t in ("model", "dataset", "project"):
            r = (await db.execute(select(Repo).where(Repo.slug == it.get("slug")))).scalar_one_or_none()
            if r:
                out.append({"type": t, "slug": r.slug, "name": r.name,
                            "owner": r.owner.username, "likes": r.likes, "downloads": r.downloads})
        elif t == "notebook":
            nb = (await db.execute(select(Notebook).where(Notebook.id == it.get("id")))).scalar_one_or_none()
            if nb:
                out.append({"type": "notebook", "id": nb.id, "title": nb.title})
    return out

def _summary(c):
    return {"slug": c.slug, "title": c.title, "cover_url": c.cover_url,
            "is_featured": c.is_featured, "count": len(c.items or [])}
```

## 43.3 CRUD koleksi (baca publik, tulis staf)

```python
@router.get("/collections")
async def list_collections(category: str | None = None, featured: bool | None = None,
                           p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(Collection)
    if featured is not None: stmt = stmt.where(Collection.is_featured == featured)
    if category:
        cat = (await db.execute(select(Category).where(Category.slug == category))).scalar_one_or_none()
        if cat: stmt = stmt.where(Collection.category_id == cat.id)
    stmt = stmt.order_by(Collection.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_summary(c) for c in rows], total, p)

@router.get("/collections/{slug}")
async def get_collection(slug: str, db=Depends(get_db)):
    c = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Koleksi tidak ditemukan")
    return {**_summary(c), "description_md": c.description_md, "items": await _resolve_items(db, c.items)}

@router.post("/collections", status_code=201)
async def create_collection(body: dict, staff=Depends(require_staff), db=Depends(get_db)):
    base = slugify(body["title"]); cslug = base
    if (await db.execute(select(Collection).where(Collection.slug == cslug))).scalar_one_or_none():
        import uuid; cslug = f"{base}-{uuid.uuid4().hex[:4]}"
    cat_id = None
    if body.get("category"):
        cat = (await db.execute(select(Category).where(Category.slug == body["category"]))).scalar_one_or_none()
        cat_id = cat.id if cat else None
    c = Collection(slug=cslug, title=body["title"], description_md=body.get("description_md", ""),
                   cover_url=body.get("cover_url"), owner_id=staff.id, category_id=cat_id,
                   is_featured=bool(body.get("is_featured", False)), items=body.get("items", []))
    db.add(c); await db.commit(); return {"slug": c.slug}

@router.patch("/collections/{slug}")
async def update_collection(slug: str, body: dict, staff=Depends(require_staff), db=Depends(get_db)):
    c = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Koleksi tidak ditemukan")
    for k in ("title", "description_md", "cover_url", "is_featured", "items"):
        if k in body: setattr(c, k, body[k])
    if "category" in body:
        cat = (await db.execute(select(Category).where(Category.slug == body["category"]))).scalar_one_or_none()
        c.category_id = cat.id if cat else None
    await db.commit(); return {"slug": c.slug}

@router.delete("/collections/{slug}", status_code=204)
async def delete_collection(slug: str, staff=Depends(require_staff), db=Depends(get_db)):
    c = (await db.execute(select(Collection).where(Collection.slug == slug))).scalar_one_or_none()
    if c: await db.delete(c); await db.commit()
```

## 43.4 Hub Transformer — agregator

```python
from app.modules.repos.schemas import to_summary

@router.get("/hub/transformer")
async def transformer_hub(db=Depends(get_db)):
    cat = (await db.execute(select(Category).where(
        Category.slug == "transformer", Category.parent_id.is_(None)))).scalar_one_or_none()
    if not cat:
        return {"category": None, "collections": [], "models": [], "datasets": [], "notebooks": []}

    async def top(kind):
        rows = (await db.execute(select(Repo).where(
            Repo.kind == kind, Repo.category_id == cat.id, Repo.visibility == "public")
            .order_by(Repo.downloads.desc()).limit(12))).scalars().all()
        return [to_summary(r) for r in rows]

    cols = (await db.execute(select(Collection).where(
        Collection.category_id == cat.id, Collection.is_featured == True)
        .order_by(Collection.created_at.desc()))).scalars().all()
    nbs = (await db.execute(select(Notebook).where(
        getattr(Notebook, "category_id", None) == cat.id).limit(12))).scalars().all() if hasattr(Notebook, "category_id") else []

    return {"category": {"slug": cat.slug, "name": cat.name, "description": getattr(cat, "description", "")},
            "collections": [_summary(c) for c in cols],
            "models": await top("model"), "datasets": await top("dataset"),
            "notebooks": [{"id": n.id, "title": n.title} for n in nbs]}
```

Wire router di `main.py`. Pastikan ada kategori utama bernama **Transformer** (buat via manajemen kategori Langkah 33 atau seed).

## 43.5 Seed (opsional) — `app/seed_content.py`

Tambah kategori `Transformer` + 1–2 koleksi unggulan (mis. "Model Bahasa Indonesia", "Notebook Fine-tuning Hemat") berisi aset contoh, agar hub tidak kosong saat peluncuran.

## 43.6 Pembaruan Kontrak (Bagian 8)

- Entitas `Collection { slug, title, description_md, cover_url, is_featured, count, items[] }` (item ter-resolusi: model/dataset/project → `{type,slug,name,owner,likes,downloads}`; notebook → `{type,id,title}`).
- `TransformerHub { category, collections[], models[], datasets[], notebooks[] }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/collections` | — | `?category=&featured=` |
| GET | `/collections/{slug}` | — | detail + item ter-resolusi |
| POST/PATCH/DELETE | `/collections[/{slug}]` | staf | kelola koleksi |
| GET | `/hub/transformer` | — | landing kurasi Transformer |

## Selesai bila

- [ ] Staf membuat/menyunting koleksi; item ter-resolusi jadi ringkasan aset.
- [ ] `GET /hub/transformer` mengembalikan kategori + koleksi unggulan + model/dataset/notebook teratas kategori Transformer.
- [ ] Koleksi non-unggulan tetap dapat diakses lewat `/collections`.
- [ ] Hub tidak error saat kategori Transformer belum ada (kembalikan kosong).
