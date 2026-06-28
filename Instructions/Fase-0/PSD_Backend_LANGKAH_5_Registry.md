# Langkah 5 — Modul Registry (projects / datasets / models)

> **Tujuan:** Endpoint daftar, detail, dan buat untuk aset registry (tiga jenis: project, dataset, model) yang berbagi satu tabel. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 4.

> **Penting (routing):** gunakan path eksplisit `/projects`, `/datasets`, `/models` — **jangan** path catch-all `/{kind}` di root, karena akan menelan rute lain (`/competitions`, `/events`, dst.).

## 5.1 Model — `app/modules/repos/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.modules.users.models import User


class Repo(Base):
    __tablename__ = "repos"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"repo_{uuid.uuid4().hex[:12]}")
    kind: Mapped[str] = mapped_column(String, index=True)        # project | dataset | model
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)   # "owner/name"
    description: Mapped[str] = mapped_column(String, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    likes: Mapped[int] = mapped_column(Integer, default=0)
    downloads: Mapped[int] = mapped_column(Integer, default=0)
    visibility: Mapped[str] = mapped_column(String, default="public")    # public | private
    readme_md: Mapped[str] = mapped_column(String, default="")
    license: Mapped[str | None] = mapped_column(String, nullable=True)
    files: Mapped[list] = mapped_column(JSON, default=list)
    metrics: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner: Mapped[User] = relationship(lazy="selectin")
```

## 5.2 Skema — `app/modules/repos/schemas.py`

```python
from datetime import datetime
from typing import Literal
from pydantic import BaseModel
from app.core.schemas import OwnerRef


class RepoSummary(BaseModel):
    id: str
    slug: str
    kind: Literal["project", "dataset", "model"]
    owner: OwnerRef
    name: str
    description: str
    tags: list[str]
    likes: int
    downloads: int
    visibility: Literal["public", "private"]
    updated_at: datetime


class FileEntry(BaseModel):
    path: str
    size_bytes: int
    type: str


class RepoDetail(RepoSummary):
    readme_md: str
    files: list[FileEntry]
    license: str | None = None
    metrics: dict | None = None


def to_summary(r) -> dict:
    return {
        "id": r.id, "slug": r.slug, "kind": r.kind, "name": r.name,
        "description": r.description, "tags": r.tags, "likes": r.likes,
        "downloads": r.downloads, "visibility": r.visibility, "updated_at": r.updated_at,
        "owner": {"username": r.owner.username, "type": "user", "avatar_url": r.owner.avatar_url},
    }


def to_detail(r) -> dict:
    return {**to_summary(r), "readme_md": r.readme_md, "files": r.files,
            "license": r.license, "metrics": r.metrics}
```

## 5.3 Router — `app/modules/repos/router.py`

```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.users.models import User
from app.modules.repos.models import Repo
from app.modules.repos.schemas import to_summary, to_detail

router = APIRouter(tags=["registry"])
KIND_MAP = {"projects": "project", "datasets": "dataset", "models": "model"}


async def _list(db, kind, q, tags, sort, p: PageParams):
    stmt = select(Repo).where(Repo.kind == kind)
    if q:
        stmt = stmt.where(Repo.name.ilike(f"%{q}%"))
    # urut sederhana: -updated_at (default) atau -downloads
    stmt = stmt.order_by(Repo.downloads.desc() if sort == "-downloads" else Repo.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([to_summary(r) for r in rows], total, p)


async def _detail(db, kind, owner, name):
    slug = f"{owner}/{name}"
    r = (await db.execute(select(Repo).where(Repo.slug == slug, Repo.kind == kind))).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    return to_detail(r)


def _register(seg: str, kind: str):
    async def list_ep(q: str | None = None, tags: str | None = None, sort: str | None = None,
                      p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
        return await _list(db, kind, q, tags, sort, p)

    async def detail_ep(owner: str, name: str, db: AsyncSession = Depends(get_db)):
        return await _detail(db, kind, owner, name)

    async def create_ep(body: dict, user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
        r = Repo(kind=kind, owner_id=user.id, name=body["name"],
                 slug=f"{user.username}/{body['name']}",
                 description=body.get("description", ""), tags=body.get("tags", []),
                 visibility=body.get("visibility", "public"))
        db.add(r); await db.commit(); await db.refresh(r)
        return to_detail(r)

    router.add_api_route(f"/{seg}", list_ep, methods=["GET"])
    router.add_api_route(f"/{seg}/{{owner}}/{{name}}", detail_ep, methods=["GET"])
    router.add_api_route(f"/{seg}", create_ep, methods=["POST"], status_code=201)


for _seg, _kind in KIND_MAP.items():
    _register(_seg, _kind)
```

## 5.4 Migrasi & wire

```bash
docker compose exec backend alembic revision --autogenerate -m "create repos"
docker compose exec backend alembic upgrade head
```

Daftarkan model di `alembic/env.py` (impor `app.modules.repos.models`) dan router di `main.py`:

```python
from app.modules.repos.router import router as repos_router
app.include_router(repos_router, prefix=settings.API_PREFIX)
```

## Selesai bila

- [ ] `GET /api/v1/projects|datasets|models` → `{ items, total, page, page_size }` (mendukung `q`, `sort`, `page`, `page_size`).
- [ ] `GET /api/v1/datasets/{owner}/{name}` → `RepoDetail`; tak ada → `404`.
- [ ] `POST /api/v1/projects` (ber-auth) membuat aset & mengembalikan detailnya.
- [ ] `/competitions`, `/events`, dll. tidak tertelan oleh rute registry.
