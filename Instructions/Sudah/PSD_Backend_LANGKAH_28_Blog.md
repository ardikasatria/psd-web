# Langkah 28 — Blog (Berita & Informasi)

> **Tujuan:** Blog resmi PSD untuk berita & informasi, dikelola oleh staf (humas/superadmin). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 13 (storage), 27 (roles).

## 28.1 Model — `app/modules/blog/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.modules.users.models import User

class BlogPost(Base):
    __tablename__ = "blog_posts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"blg_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    summary: Mapped[str] = mapped_column(String, default="")
    body_md: Mapped[str] = mapped_column(String, default="")
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)  # draft | published
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "blog"
docker compose exec backend alembic upgrade head
```

## 28.2 Router — `app/modules/blog/router.py`

```python
from datetime import datetime, timezone
import uuid
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import require_staff, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.core.storage import upload_public
from app.modules.blog.models import BlogPost

router = APIRouter(tags=["blog"])

def _owner(u):
    return {"username": u.username, "type": "org" if u.account_type == "organization" else "user",
            "avatar_url": u.avatar_url, "is_official": u.is_official}

def _summary(b):
    return {"slug": b.slug, "title": b.title, "summary": b.summary, "cover_url": b.cover_url,
            "tags": b.tags, "author": _owner(b.author), "published_at": b.published_at}

@router.get("/blog")
async def list_blog(tag: str | None = None, p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(BlogPost).where(BlogPost.status == "published").order_by(BlogPost.published_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_summary(b) for b in rows], total, p)

@router.get("/blog/{slug}")
async def get_blog(slug: str, viewer=Depends(get_current_user_optional), db=Depends(get_db)):
    b = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if not b:
        raise ApiError(404, "not_found", "Artikel tidak ditemukan")
    is_staff = viewer and viewer.role in ("moderator", "superadmin")
    if b.status != "published" and not is_staff:
        raise ApiError(404, "not_found", "Artikel tidak ditemukan")
    return {**_summary(b), "body_md": b.body_md, "status": b.status}

@router.post("/blog", status_code=201)
async def create_blog(body: dict, user=Depends(require_staff), db=Depends(get_db)):
    if (await db.execute(select(BlogPost).where(BlogPost.slug == body["slug"]))).scalar_one_or_none():
        raise ApiError(409, "exists", "Slug sudah dipakai")
    b = BlogPost(slug=body["slug"], title=body["title"], summary=body.get("summary", ""),
                 body_md=body.get("body_md", ""), cover_url=body.get("cover_url"),
                 tags=body.get("tags", []), author_id=user.id, status="draft")
    db.add(b); await db.commit()
    return {"slug": b.slug}

@router.patch("/blog/{slug}")
async def update_blog(slug: str, body: dict, user=Depends(require_staff), db=Depends(get_db)):
    b = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if not b:
        raise ApiError(404, "not_found", "Artikel tidak ditemukan")
    for k in ("title", "summary", "body_md", "cover_url", "tags", "status"):
        if k in body:
            setattr(b, k, body[k])
    if body.get("status") == "published" and not b.published_at:
        b.published_at = datetime.now(timezone.utc)
    await db.commit()
    return {"slug": b.slug}

@router.delete("/blog/{slug}", status_code=204)
async def delete_blog(slug: str, user=Depends(require_staff), db=Depends(get_db)):
    b = (await db.execute(select(BlogPost).where(BlogPost.slug == slug))).scalar_one_or_none()
    if b:
        await db.delete(b); await db.commit()

@router.post("/blog/images")
async def blog_image(file: UploadFile = File(...), user=Depends(require_staff), db=Depends(get_db)):
    ext = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}.get(file.content_type)
    if not ext:
        raise ApiError(422, "invalid_file", "Format jpg/png/webp")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024:
        raise ApiError(413, "too_large", "Maks 5 MB")
    return {"url": upload_public(f"blog/{uuid.uuid4().hex}.{ext}", data, file.content_type)}
```

Wire router blog di `main.py`. (Opsional) tampilkan blog terbaru di `GET /discover`.

## 28.3 Pembaruan Kontrak (Bagian 8)

- Entitas `BlogSummary { slug, title, summary, cover_url, tags, author, published_at }`, `BlogDetail` + `body_md`, `status`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/blog` | — | published, paginated |
| GET | `/blog/{slug}` | — (staf lihat draft) | detail |
| POST | `/blog` | staf | buat draft |
| PATCH | `/blog/{slug}` | staf | edit/terbit |
| DELETE | `/blog/{slug}` | staf | hapus |
| POST | `/blog/images` | staf | multipart → `{ url }` |

## Selesai bila

- [ ] Publik melihat artikel published; draft hanya untuk staf.
- [ ] Staf (moderator/superadmin) membuat, mengedit, menerbitkan, & menghapus artikel.
- [ ] Cover & gambar dalam artikel terunggah ke `psd-media`.
- [ ] Slug unik; menerbitkan mengisi `published_at`.
