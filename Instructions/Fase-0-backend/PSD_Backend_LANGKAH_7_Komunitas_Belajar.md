# Langkah 7 — Modul Komunitas & Belajar

> **Tujuan:** Forum (utas + balasan), course & learning path, notebook (stub), dan profil pengguna/portofolio. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 6.

## 7.1 Model — `app/modules/community/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.modules.users.models import User


class Thread(Base):
    __tablename__ = "threads"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"thr_{uuid.uuid4().hex[:12]}")
    title: Mapped[str] = mapped_column(String)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body_md: Mapped[str] = mapped_column(String, default="")
    tags: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_activity_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")


class Post(Base):
    __tablename__ = "posts"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"pst_{uuid.uuid4().hex[:12]}")
    thread_id: Mapped[str] = mapped_column(ForeignKey("threads.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    body_md: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")
```

## 7.2 Model — `app/modules/learn/models.py`

```python
import uuid
from sqlalchemy import String, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class Course(Base):
    __tablename__ = "courses"
    slug: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    level: Mapped[str] = mapped_column(String)   # pemula | menengah | mahir
    cover_url: Mapped[str | None] = mapped_column(String, nullable=True)
    description: Mapped[str] = mapped_column(String, default="")
    modules: Mapped[list] = mapped_column(JSON, default=list)  # [{title, lessons:[{id,title,duration_min}]}]

    @property
    def lessons_count(self) -> int:
        return sum(len(m.get("lessons", [])) for m in (self.modules or []))


class LearningPath(Base):
    __tablename__ = "learning_paths"
    slug: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    course_slugs: Mapped[list] = mapped_column(JSON, default=list)


class Notebook(Base):
    __tablename__ = "notebooks"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"nb_{uuid.uuid4().hex[:12]}")
    title: Mapped[str] = mapped_column(String)
    owner_username: Mapped[str] = mapped_column(String)
    owner_avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(String, default="")
    status: Mapped[str] = mapped_column(String, default="stub")  # ready | stub
```

## 7.3 Router Komunitas — `app/modules/community/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.users.models import User
from app.modules.community.models import Thread, Post

router = APIRouter(tags=["community"])


def _owner(u): return {"username": u.username, "type": "user", "avatar_url": u.avatar_url}


async def _replies(db, tid): 
    return (await db.execute(select(func.count()).select_from(Post).where(Post.thread_id == tid))).scalar_one()


def _summary(t, replies):
    return {"id": t.id, "title": t.title, "author": _owner(t.author), "tags": t.tags,
            "replies": replies, "created_at": t.created_at, "last_activity_at": t.last_activity_at}


@router.get("/forum/threads")
async def list_threads(q: str | None = None, p: PageParams = Depends(page_params),
                       db: AsyncSession = Depends(get_db)):
    stmt = select(Thread)
    if q:
        stmt = stmt.where(Thread.title.ilike(f"%{q}%"))
    stmt = stmt.order_by(Thread.last_activity_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_summary(t, await _replies(db, t.id)) for t in rows], total, p)


@router.get("/forum/threads/{thread_id}")
async def get_thread(thread_id: str, db: AsyncSession = Depends(get_db)):
    t = (await db.execute(select(Thread).where(Thread.id == thread_id))).scalar_one_or_none()
    if not t:
        raise ApiError(404, "not_found", "Utas tidak ditemukan")
    posts = (await db.execute(select(Post).where(Post.thread_id == t.id)
             .order_by(Post.created_at.asc()))).scalars().all()
    return {**_summary(t, len(posts)), "body_md": t.body_md,
            "posts": [{"id": p.id, "author": _owner(p.author), "body_md": p.body_md,
                       "created_at": p.created_at} for p in posts]}


@router.post("/forum/threads", status_code=201)
async def create_thread(body: dict, user: User = Depends(get_current_user),
                        db: AsyncSession = Depends(get_db)):
    t = Thread(title=body["title"], author_id=user.id, body_md=body.get("body_md", ""),
               tags=body.get("tags", []))
    db.add(t); await db.commit(); await db.refresh(t)
    return await get_thread(t.id, db)
```

## 7.4 Router Belajar — `app/modules/learn/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.learn.models import Course, LearningPath, Notebook

router = APIRouter(tags=["learn"])


@router.get("/courses")
async def list_courses(level: str | None = None, p: PageParams = Depends(page_params),
                       db: AsyncSession = Depends(get_db)):
    stmt = select(Course)
    if level:
        stmt = stmt.where(Course.level == level)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [{"slug": c.slug, "title": c.title, "level": c.level,
              "lessons_count": c.lessons_count, "cover_url": c.cover_url} for c in rows]
    return paginated(items, total, p)


@router.get("/courses/{slug}")
async def get_course(slug: str, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Course).where(Course.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Course tidak ditemukan")
    return {"slug": c.slug, "title": c.title, "level": c.level, "lessons_count": c.lessons_count,
            "cover_url": c.cover_url, "description": c.description, "modules": c.modules}


@router.get("/learning-paths")
async def list_paths(p: PageParams = Depends(page_params), db: AsyncSession = Depends(get_db)):
    stmt = select(LearningPath)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [{"slug": lp.slug, "title": lp.title, "description": lp.description,
              "courses_count": len(lp.course_slugs)} for lp in rows]
    return paginated(items, total, p)


@router.get("/learning-paths/{slug}")
async def get_path(slug: str, db: AsyncSession = Depends(get_db)):
    lp = (await db.execute(select(LearningPath).where(LearningPath.slug == slug))).scalar_one_or_none()
    if not lp:
        raise ApiError(404, "not_found", "Learning path tidak ditemukan")
    return {"slug": lp.slug, "title": lp.title, "description": lp.description,
            "courses_count": len(lp.course_slugs), "course_slugs": lp.course_slugs}


@router.get("/notebooks")
async def list_notebooks(q: str | None = None, p: PageParams = Depends(page_params),
                         db: AsyncSession = Depends(get_db)):
    stmt = select(Notebook)
    if q:
        stmt = stmt.where(Notebook.title.ilike(f"%{q}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    items = [{"id": n.id, "title": n.title, "tags": n.tags,
              "owner": {"username": n.owner_username, "type": "user", "avatar_url": n.owner_avatar_url}}
             for n in rows]
    return paginated(items, total, p)


@router.get("/notebooks/{nb_id}")
async def get_notebook(nb_id: str, db: AsyncSession = Depends(get_db)):
    n = (await db.execute(select(Notebook).where(Notebook.id == nb_id))).scalar_one_or_none()
    if not n:
        raise ApiError(404, "not_found", "Notebook tidak ditemukan")
    return {"id": n.id, "title": n.title, "tags": n.tags, "description": n.description,
            "status": n.status,
            "owner": {"username": n.owner_username, "type": "user", "avatar_url": n.owner_avatar_url}}


@router.post("/notebooks/{nb_id}/launch")
async def launch(nb_id: str):
    # Fase 0: stub — JupyterHub nyata menyusul.
    return {"url": None, "status": "stub"}
```

## 7.5 Router Users/Profil — `app/modules/users/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.users.models import User
from app.modules.repos.models import Repo
from app.modules.repos.schemas import to_summary

router = APIRouter(tags=["users"])


@router.get("/users/{username}")
async def get_user(username: str, db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    repos = (await db.execute(select(func.count()).select_from(Repo)
             .where(Repo.owner_id == u.id))).scalar_one()
    return {"id": u.id, "username": u.username, "name": u.name, "avatar_url": u.avatar_url,
            "bio": u.bio, "role": u.role, "created_at": u.created_at, "stats": {"repos": repos}}


@router.get("/users/{username}/portfolio")
async def portfolio(username: str, p: PageParams = Depends(page_params),
                    db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    stmt = select(Repo).where(Repo.owner_id == u.id).order_by(Repo.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([to_summary(r) for r in rows], total, p)
```

## 7.6 Migrasi & wire

```bash
docker compose exec backend alembic revision --autogenerate -m "create community learn users"
docker compose exec backend alembic upgrade head
```

Impor model baru di `alembic/env.py` (`community.models`, `learn.models`) dan daftarkan router di `main.py`:

```python
from app.modules.community.router import router as community_router
from app.modules.learn.router import router as learn_router
from app.modules.users.router import router as users_router
for r in (community_router, learn_router, users_router):
    app.include_router(r, prefix=settings.API_PREFIX)
```

## Selesai bila

- [ ] Forum: list, detail (dengan posts), dan create thread (ber-auth) bekerja.
- [ ] Course & learning path: list + detail sesuai kontrak (`lessons_count`, `courses_count` benar).
- [ ] Notebook: list + detail; `launch` mengembalikan stub.
- [ ] `GET /users/{username}` (+ stats) dan `/portfolio` bekerja.
- [ ] Seluruh endpoint kontrak (Bagian 8 dokumen frontend) kini tersedia di `/docs`.
