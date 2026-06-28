# Langkah 1 — Setup Proyek & Struktur

> **Tujuan:** Backend FastAPI berjalan lokal dengan endpoint health. Belum ada DB/fitur. **Kerjakan hanya langkah ini.**

## 1.1 Struktur folder (buat repo backend baru, terpisah dari frontend)

```
psd-backend/
  app/
    main.py                 # entry FastAPI: CORS, router, (handler error → Langkah 3)
    core/
      config.py             # settings dari env (pydantic-settings)
    modules/
      health/
        router.py           # GET /api/v1/health
    __init__.py
  requirements.txt
  .env.example
  .gitignore
```

(Modul lain — auth, repos, competitions, dst. — ditambah pada langkah berikutnya.)

## 1.2 `requirements.txt`

```
fastapi
uvicorn[standard]
pydantic-settings
sqlalchemy
asyncpg
alembic
psycopg2-binary
redis
```

> Versi sengaja tidak dikunci agar mudah dipasang; setelah jalan, lakukan `pip freeze > requirements.lock` untuk mengunci.

## 1.3 `app/core/config.py`

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    API_PREFIX: str = "/api/v1"
    APP_NAME: str = "Projek Sains Data API"

    # Database (asyncpg untuk app)
    DATABASE_URL: str = "postgresql+asyncpg://psd:psd@localhost:5432/psd"

    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS — origin frontend Next.js
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]

    # Auth (dipakai mulai Langkah 4)
    JWT_SECRET: str = "ganti-di-produksi"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24


settings = Settings()
```

## 1.4 `app/modules/health/router.py`

```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    return {"status": "ok"}
```

## 1.5 `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.modules.health.router import router as health_router

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix=settings.API_PREFIX)
# Handler error global & router lain ditambah pada Langkah 3+.
```

## 1.6 `.env.example`

```
DATABASE_URL=postgresql+asyncpg://psd:psd@localhost:5432/psd
REDIS_URL=redis://localhost:6379/0
BACKEND_CORS_ORIGINS=["http://localhost:3000"]
JWT_SECRET=ganti-di-produksi
```

## 1.7 `.gitignore`

```
__pycache__/
*.pyc
.venv/
.env
```

## 1.8 Jalankan lokal

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

## Selesai bila

- [ ] `GET http://localhost:8000/api/v1/health` → `{ "status": "ok" }`.
- [ ] Dokumentasi otomatis terbuka di `http://localhost:8000/docs`.
- [ ] Struktur folder sesuai 1.1; belum ada endpoint lain.
