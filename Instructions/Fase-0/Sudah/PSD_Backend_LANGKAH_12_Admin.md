# Langkah 12 — Admin: Manajemen Pengguna & Seluruh Fitur

> **Tujuan:** Endpoint khusus admin untuk mengelola pengguna, aset, kompetisi, event, course, learning path, dan forum. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 4–7 (semua modul inti).
>
> **Pola:** satu resource ditulis penuh sebagai template (Users + Competitions); sisanya ikuti pola yang sama sesuai spesifikasi di Bagian 12.6.

## 12.1 Tambah `is_active` ke User — `app/modules/users/models.py`

```python
from sqlalchemy import Boolean
is_active: Mapped[bool] = mapped_column(Boolean, default=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "user is_active"
docker compose exec backend alembic upgrade head
```

Tolak pengguna nonaktif saat login & autentikasi — di `get_current_user` (deps) dan `login` (auth), setelah memuat user tambahkan:

```python
if not user.is_active:
    raise ApiError(403, "forbidden", "Akun dinonaktifkan")
```

## 12.2 Buat admin pertama

```bash
docker compose exec db psql -U psd -d psd -c "UPDATE users SET role='admin' WHERE username='satria';"
```

## 12.3 Penjaga admin — `app/core/deps.py`

```python
async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise ApiError(403, "forbidden", "Akses khusus admin")
    return user
```

## 12.4 Router admin — `app/modules/admin/router.py` (template)

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.core.deps import require_admin
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.users.models import User
from app.modules.repos.models import Repo
from app.modules.competitions.models import Competition
from app.modules.events.models import Event
from app.modules.learn.models import Course, LearningPath
from app.modules.community.models import Thread

router = APIRouter(tags=["admin"], dependencies=[Depends(require_admin)])  # SEMUA rute = admin


# ---- Ringkasan ----
@router.get("/admin/stats")
async def stats(db: AsyncSession = Depends(get_db)):
    async def c(model):
        return (await db.execute(select(func.count()).select_from(model))).scalar_one()
    return {"users": await c(User), "repos": await c(Repo), "competitions": await c(Competition),
            "events": await c(Event), "courses": await c(Course), "threads": await c(Thread)}


# ---- Users (template manajemen pengguna) ----
def _admin_user(u):
    return {"id": u.id, "username": u.username, "email": u.email, "name": u.name,
            "role": u.role, "is_active": u.is_active, "created_at": u.created_at}


@router.get("/admin/users")
async def list_users(q: str | None = None, p: PageParams = Depends(page_params),
                     db: AsyncSession = Depends(get_db)):
    stmt = select(User)
    if q:
        stmt = stmt.where(or_(User.username.ilike(f"%{q}%"), User.email.ilike(f"%{q}%")))
    stmt = stmt.order_by(User.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_admin_user(u) for u in rows], total, p)


@router.patch("/admin/users/{user_id}")
async def update_user(user_id: str, body: dict, db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if not u:
        raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    if "role" in body:
        u.role = body["role"]            # user | org_admin | admin
    if "is_active" in body:
        u.is_active = bool(body["is_active"])
    await db.commit(); await db.refresh(u)
    return _admin_user(u)


@router.delete("/admin/users/{user_id}", status_code=204)
async def delete_user(user_id: str, db: AsyncSession = Depends(get_db)):
    u = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if u:
        await db.delete(u); await db.commit()


# ---- Competitions (template CRUD konten) ----
@router.post("/admin/competitions", status_code=201)
async def create_competition(body: dict, db: AsyncSession = Depends(get_db)):
    c = Competition(**body)            # body sesuai field Competition (slug, title, status, metric, ...)
    db.add(c); await db.commit(); await db.refresh(c)
    return {"slug": c.slug}


@router.patch("/admin/competitions/{slug}")
async def update_competition(slug: str, body: dict, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if not c:
        raise ApiError(404, "not_found", "Kompetisi tidak ditemukan")
    for k, v in body.items():
        setattr(c, k, v)
    await db.commit()
    return {"slug": c.slug}


@router.delete("/admin/competitions/{slug}", status_code=204)
async def delete_competition(slug: str, db: AsyncSession = Depends(get_db)):
    c = (await db.execute(select(Competition).where(Competition.slug == slug))).scalar_one_or_none()
    if c:
        await db.delete(c); await db.commit()
```

## 12.5 Wire ke `app/main.py`

```python
from app.modules.admin.router import router as admin_router
app.include_router(admin_router, prefix=settings.API_PREFIX)
```

## 12.6 Sisanya — ikuti pola yang sama

Replikasi pola **Competitions** (create/patch/delete by slug) atau **Users** (list/delete by id):

| Resource | Endpoint | Pola |
|---|---|---|
| Events | `POST/PATCH/DELETE /admin/events[/{slug}]` | seperti Competitions (by slug) |
| Courses | `POST/PATCH/DELETE /admin/courses[/{slug}]` | seperti Competitions (slug = PK) |
| Learning paths | `POST/PATCH/DELETE /admin/learning-paths[/{slug}]` | seperti Competitions |
| Repos (aset) | `GET /admin/repos` (termasuk privat), `PATCH /admin/repos/{id}` (visibility), `DELETE /admin/repos/{id}` | list seperti Users; ubah/delete by id |
| Forum | `DELETE /admin/threads/{id}` (moderasi) | delete by id |

> Catatan: `GET /admin/repos` tampilkan semua aset termasuk `visibility=private` (berbeda dari endpoint publik yang hanya publik).

## 12.7 Pembaruan Kontrak (tambahkan ke Bagian 8 dokumen frontend)

Entitas: `AdminUser { id, username, email, name, role, is_active, created_at }`, `AdminStats { users, repos, competitions, events, courses, threads }`.

Semua endpoint `/admin/*` **butuh role `admin`** (selain `Authorization: Bearer`). Daftar endpoint sesuai tabel 12.4 & 12.6.

## Selesai bila

- [ ] Akun admin pertama dibuat; non-admin menerima `403` di semua rute `/admin/*`.
- [ ] `GET /admin/stats` mengembalikan jumlah tiap resource.
- [ ] Users: list (cari), ubah role/is_active, hapus berfungsi; login akun nonaktif ditolak.
- [ ] Competitions: create/patch/delete berfungsi (template).
- [ ] Events, courses, learning-paths, repos, threads diimplementasikan mengikuti pola.
- [ ] Kontrak Bagian 8 diperbarui dengan entitas & endpoint admin.
