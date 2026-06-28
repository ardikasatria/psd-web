# Langkah 22 — Notebook (Lingkup Fase 0: Katalog + Buka di Colab)

> **Tujuan:** Notebook sebagai katalog referensi `.ipynb` yang bisa **dibuka di Google Colab**. Tanpa eksekusi/hosting (JupyterHub = Fase 3). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 7.

> **Keputusan lingkup:** "Buka di Colab" bekerja andal untuk notebook yang sumbernya di **GitHub** (Colab mengimpor langsung dari GitHub). Notebook bersumber dari URL lain tetap bisa didaftarkan, tetapi tombol Colab hanya muncul bila sumbernya GitHub.

## 22.1 Ubah model Notebook — `app/modules/learn/models.py`

Ganti kolom lama (`owner_username`, `owner_avatar_url`, `status`) dengan kepemilikan FK + sumber:

```python
import uuid
from datetime import datetime
from sqlalchemy import String, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.modules.users.models import User

class Notebook(Base):
    __tablename__ = "notebooks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"nb_{uuid.uuid4().hex[:12]}")
    title: Mapped[str] = mapped_column(String)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    description: Mapped[str] = mapped_column(String, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    source_url: Mapped[str | None] = mapped_column(String, nullable=True)   # .ipynb (GitHub disarankan)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    owner: Mapped[User] = relationship(lazy="selectin")
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "notebook source and owner"
docker compose exec backend alembic upgrade head
```

> Re-seed notebook (data lama tak kompatibel). Pada `seed_content`, buat beberapa notebook milik akun `psd` dengan `source_url` GitHub nyata.

## 22.2 Helper Colab — `app/modules/learn/notebooks.py`

```python
import re

_GH = re.compile(r"^https?://github\.com/([^/]+)/([^/]+)/blob/(.+\.ipynb)$")

def colab_url(source_url: str | None) -> str | None:
    if not source_url:
        return None
    m = _GH.match(source_url.strip())
    if not m:
        return None
    owner, repo, rest = m.groups()
    return f"https://colab.research.google.com/github/{owner}/{repo}/blob/{rest}"
```

## 22.3 Endpoint — ganti bagian notebook di `app/modules/learn/router.py`

```python
from app.core.deps import get_current_user
from app.modules.learn.models import Notebook
from app.modules.learn.notebooks import colab_url

def _nb_owner(n):
    return {"username": n.owner.username, "type": "user", "avatar_url": n.owner.avatar_url,
            "is_official": n.owner.is_official}

@router.get("/notebooks")
async def list_notebooks(q: str | None = None, p: PageParams = Depends(page_params),
                         db: AsyncSession = Depends(get_db)):
    stmt = select(Notebook)
    if q:
        stmt = stmt.where(Notebook.title.ilike(f"%{q}%"))
    stmt = stmt.order_by(Notebook.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([{"id": n.id, "title": n.title, "tags": n.tags, "owner": _nb_owner(n)}
                      for n in rows], total, p)

@router.get("/notebooks/{nb_id}")
async def get_notebook(nb_id: str, db: AsyncSession = Depends(get_db)):
    n = (await db.execute(select(Notebook).where(Notebook.id == nb_id))).scalar_one_or_none()
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    return {"id": n.id, "title": n.title, "description": n.description, "tags": n.tags,
            "owner": _nb_owner(n), "source_url": n.source_url, "colab_url": colab_url(n.source_url)}

@router.post("/notebooks", status_code=201)
async def create_notebook(body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    n = Notebook(title=body["title"], owner_id=user.id, description=body.get("description", ""),
                 tags=body.get("tags", []), source_url=body.get("source_url"))
    db.add(n); await db.commit(); await db.refresh(n)
    return await get_notebook(n.id, db)

@router.patch("/notebooks/{nb_id}")
async def update_notebook(nb_id: str, body: dict, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    n = (await db.execute(select(Notebook).where(Notebook.id == nb_id))).scalar_one_or_none()
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    if n.owner_id != user.id and user.role != "admin":
        raise ApiError(403, "forbidden", "Bukan pemilik notebook")
    for k in ("title", "description", "tags", "source_url"):
        if k in body:
            setattr(n, k, body[k])
    await db.commit()
    return await get_notebook(n.id, db)

@router.delete("/notebooks/{nb_id}", status_code=204)
async def delete_notebook(nb_id: str, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    n = (await db.execute(select(Notebook).where(Notebook.id == nb_id))).scalar_one_or_none()
    if n and (n.owner_id == user.id or user.role == "admin"):
        await db.delete(n); await db.commit()
```

**Hapus** endpoint stub `POST /notebooks/{id}/launch` (Langkah 7) — digantikan `colab_url`.

## 22.4 Pembaruan Kontrak (Bagian 8 dokumen frontend)

- `NotebookDetail` kini: `{ id, title, description, tags, owner: OwnerRef, source_url: string|null, colab_url: string|null }`. `NotebookSummary`: `{ id, title, tags, owner }`.
- **Hapus** `POST /notebooks/{id}/launch`.

| Metode | Path | Auth | Body |
|---|---|---|---|
| POST | `/notebooks` | ✓ | `{ title, description, tags, source_url }` |
| PATCH | `/notebooks/{id}` | pemilik/admin | sebagian field |
| DELETE | `/notebooks/{id}` | pemilik/admin | — |

## Selesai bila

- [ ] Katalog & detail notebook menampilkan pemilik & tag; pencarian `q` bekerja.
- [ ] `colab_url` terisi untuk sumber GitHub `.ipynb` dan `null` untuk lainnya.
- [ ] Pengguna login dapat membuat notebook; pemilik/admin dapat edit & hapus.
- [ ] Endpoint `launch` lama dihapus; tidak ada referensi tersisa.
