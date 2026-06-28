# Langkah 3 — Database & Fondasi Skema

> **Tujuan:** Koneksi DB async, migrasi Alembic, konvensi bersama (paginasi + amplop error sesuai kontrak), dan tabel `User` pertama sebagai bukti pipeline migrasi. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 2 berjalan.

## 3.1 Koneksi DB — `app/core/db.py`

```python
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, future=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
```

## 3.2 Amplop error (cocok kontrak) — `app/core/errors.py`

```python
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str, details=None):
        self.status, self.code, self.message, self.details = status, code, message, details


def _body(code: str, message: str, details=None):
    err = {"code": code, "message": message}
    if details is not None:
        err["details"] = details
    return {"error": err}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api(_: Request, e: ApiError):
        return JSONResponse(status_code=e.status, content=_body(e.code, e.message, e.details))

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, e: StarletteHTTPException):
        return JSONResponse(status_code=e.status_code, content=_body("http_error", str(e.detail)))

    @app.exception_handler(RequestValidationError)
    async def _val(_: Request, e: RequestValidationError):
        return JSONResponse(status_code=422, content=_body("validation_error", "Data tidak valid", e.errors()))
```

## 3.3 Paginasi (cocok kontrak) — `app/core/pagination.py`

```python
from dataclasses import dataclass
from pydantic import BaseModel
from fastapi import Query


@dataclass
class PageParams:
    page: int
    page_size: int

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def page_params(page: int = Query(1, ge=1), page_size: int = Query(20, ge=1, le=100)) -> PageParams:
    return PageParams(page=page, page_size=page_size)


def paginated(items: list, total: int, p: PageParams) -> dict:
    return {"items": items, "total": total, "page": p.page, "page_size": p.page_size}


class Paginated(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
```

## 3.4 Skema bersama — `app/core/schemas.py`

```python
from typing import Literal
from pydantic import BaseModel


class OwnerRef(BaseModel):
    username: str
    type: Literal["user", "org"]
    avatar_url: str | None = None
```

## 3.5 Modul User — `app/modules/users/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"usr_{uuid.uuid4().hex[:12]}")
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    email: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    hashed_password: Mapped[str] = mapped_column(String)          # diisi pada Langkah 4
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    bio: Mapped[str | None] = mapped_column(String, nullable=True)
    role: Mapped[str] = mapped_column(String, default="user")     # user | org_admin | admin
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

## 3.6 Skema User (cocok kontrak) — `app/modules/users/schemas.py`

```python
from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    username: str
    name: str
    avatar_url: str | None = None
    bio: str | None = None
    role: Literal["user", "org_admin", "admin"]
    created_at: datetime
```

## 3.7 Alembic (migrasi pakai driver sync)

```bash
pip install alembic    # sudah ada di requirements
alembic init alembic
```

- Di `alembic.ini`, kosongkan `sqlalchemy.url` (diisi dari env di `env.py`).
- Ganti bagian atas `alembic/env.py` agar memakai URL **sync** (psycopg2) dan metadata model:

```python
import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context

from app.core.db import Base
from app.modules.users import models as _users  # noqa: F401  (daftarkan model)

config = context.config
# URL app pakai asyncpg → ubah ke sync untuk Alembic
sync_url = os.getenv("DATABASE_URL", "postgresql+asyncpg://psd:psd@localhost:5432/psd") \
    .replace("+asyncpg", "+psycopg2")
config.set_main_option("sqlalchemy.url", sync_url)

if config.config_file_name:
    fileConfig(config.config_file_name)
target_metadata = Base.metadata
```

(Sisanya — fungsi `run_migrations_online/offline` bawaan — biarkan default.)

Buat & jalankan migrasi:

```bash
alembic revision --autogenerate -m "create users"
alembic upgrade head
```

> Saat memakai Docker, jalankan Alembic dari host dengan `DATABASE_URL` menunjuk `localhost:5432`, atau `docker compose exec backend alembic upgrade head` (host DB = `db`).

## 3.8 Sambungkan ke app — perbarui `app/main.py`

Tambahkan setelah pembuatan `app`:

```python
from app.core.errors import register_error_handlers
register_error_handlers(app)
```

Dan endpoint verifikasi DB sementara (boleh dihapus setelah Langkah 4):

```python
from fastapi import Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db

@app.get(settings.API_PREFIX + "/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    await db.execute(text("SELECT 1"))
    return {"db": "ok"}
```

## Selesai bila

- [ ] `alembic upgrade head` sukses; tabel `users` ada di Postgres.
- [ ] `GET /api/v1/health/db` → `{ "db": "ok" }`.
- [ ] Memicu error (mis. path tak ada) menghasilkan body `{ "error": { "code", "message" } }`.
- [ ] `Paginated`, `PageParams`, `OwnerRef`, dan `UserOut` siap dipakai modul berikutnya.

> Fondasi siap. Lanjut ke **Langkah 4 — Modul Auth** untuk register/login/me + JWT.
