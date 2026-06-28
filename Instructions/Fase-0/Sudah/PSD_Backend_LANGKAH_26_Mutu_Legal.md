# Langkah 26 — Mutu, Keamanan & Legal (Rate Limit, Header, Error Seragam, Persetujuan)

> **Tujuan:** Pengerasan lintas-fitur: rate limit, header keamanan, penanganan error yang seragam, dan pencatatan persetujuan ToS/Privasi. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 1–25.

## 26.1 Klien Redis async — `app/core/redis.py`

```python
import redis.asyncio as redis
from app.core.config import settings

redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
```

(Tambahkan `redis` ke `requirements.txt` bila belum; `docker compose up -d --build`.)

## 26.2 Rate limit — `app/core/ratelimit.py`

```python
from fastapi import Request, Depends
from app.core.errors import ApiError
from app.core.redis import redis_client

def rate_limit(name: str, limit: int, window_sec: int):
    async def dep(request: Request):
        ident = request.client.host if request.client else "unknown"
        key = f"rl:{name}:{ident}"
        count = await redis_client.incr(key)
        if count == 1:
            await redis_client.expire(key, window_sec)
        if count > limit:
            raise ApiError(429, "rate_limited", "Terlalu banyak permintaan. Coba lagi nanti.")
    return Depends(dep)
```

Pasang pada endpoint sensitif (per-IP):

```python
# auth (Langkah 4/14)
@router.post("/auth/login", dependencies=[rate_limit("login", 10, 60)])
@router.post("/auth/register", dependencies=[rate_limit("register", 5, 3600)])
@router.post("/auth/forgot-password", dependencies=[rate_limit("forgot", 5, 3600)])
# aksi tulis (lapis di atas batas tier gamifikasi)
@router.post("/posts", dependencies=[rate_limit("post", 20, 60)])
@router.post("/posts/{post_id}/comments", dependencies=[rate_limit("comment", 30, 60)])
@router.post("/competitions/{slug}/submissions", dependencies=[rate_limit("submit", 10, 60)])
```

> Rate limit (anti-burst, per-IP) berbeda dari batas tier (per-hari, per-pengguna). Keduanya saling melengkapi.

## 26.3 Header keamanan & batas ukuran — `app/main.py`

```python
@app.middleware("http")
async def security_headers(request, call_next):
    resp = await call_next(request)
    resp.headers["X-Content-Type-Options"] = "nosniff"
    resp.headers["X-Frame-Options"] = "DENY"
    resp.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    resp.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    return resp
```

> Batas ukuran unggah sudah ditegakkan per-endpoint (avatar/aset/submission/gambar). Di reverse proxy (Caddy), set pula `request_body max_size` sebagai lapis tambahan.

## 26.4 Error seragam — `app/main.py`

Pastikan **semua** error keluar dalam amplop `{ "error": { code, message, details? } }`:

```python
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

@app.exception_handler(RequestValidationError)
async def on_validation(request, exc):
    return JSONResponse(status_code=422,
        content={"error": {"code": "validation", "message": "Input tidak valid", "details": exc.errors()}})

@app.exception_handler(Exception)
async def on_unhandled(request, exc):
    # log exc di sini
    return JSONResponse(status_code=500,
        content={"error": {"code": "internal", "message": "Terjadi kesalahan pada server"}})
```

(Handler `ApiError` sudah ada sejak Langkah 3 — biarkan.)

## 26.5 Persetujuan ToS/Privasi

`User` (`app/modules/users/models.py`):

```python
accepted_tos_at:      Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
accepted_tos_version: Mapped[str | None]      = mapped_column(String, nullable=True)
```

Config: `TOS_VERSION: str = "2026-06"`.

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "tos acceptance"
docker compose exec backend alembic upgrade head
```

Di `register` (Langkah 4): wajibkan `body.accept_tos == true`, lalu set:

```python
from datetime import datetime, timezone
if not body.get("accept_tos"):
    raise ApiError(400, "tos_required", "Anda harus menyetujui Ketentuan Layanan & Kebijakan Privasi")
user.accepted_tos_at = datetime.now(timezone.utc)
user.accepted_tos_version = settings.TOS_VERSION
```

Re-persetujuan saat versi berubah:

```python
@router.post("/me/accept-tos")
async def accept_tos(user=Depends(get_current_user), db=Depends(get_db)):
    user.accepted_tos_at = datetime.now(timezone.utc)
    user.accepted_tos_version = settings.TOS_VERSION
    await db.commit()
    return {"ok": True}
```

Sertakan di `/auth/me`: `accepted_tos_version` dan `tos_current = settings.TOS_VERSION` (agar frontend bisa meminta re-persetujuan bila berbeda).

## 26.6 Pembaruan Kontrak (Bagian 8)

- `register` body **+** `accept_tos: boolean` (wajib true).
- `/auth/me` **+** `accepted_tos_version`, `tos_current`.
- `POST /me/accept-tos` (auth).
- Error baru: `429 rate_limited`, `400 tos_required`. Validasi → `422 validation` dengan `details`.

## Selesai bila

- [ ] Endpoint sensitif menolak burst dengan `429 rate_limited`.
- [ ] Header keamanan muncul di setiap respons.
- [ ] Semua error (validasi, tak tertangani) memakai amplop seragam.
- [ ] Register menolak tanpa `accept_tos`; persetujuan & versinya tercatat.
- [ ] `/auth/me` mengekspos versi ToS untuk memicu re-persetujuan bila berubah.
