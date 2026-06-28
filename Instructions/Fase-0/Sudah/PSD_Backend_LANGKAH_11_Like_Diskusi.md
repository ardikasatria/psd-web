# Langkah 11 — Komunitas Hidup: Like + Diskusi per-Aset

> **Tujuan:** Pengguna bisa menyukai aset dan berdiskusi langsung di halaman aset. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 7 (community) & Langkah 5 (repos).

## 11.1 Dependency auth-opsional — tambahkan di `app/core/deps.py`

Dipakai agar endpoint publik bisa tahu apakah pengguna (jika login) sudah menyukai aset.

```python
async def get_current_user_optional(
    authorization: str | None = Header(default=None),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    sub = decode_token(authorization.split(" ", 1)[1])
    if not sub:
        return None
    return (await db.execute(select(User).where(User.id == sub))).scalar_one_or_none()
```

## 11.2 Model like — tambahkan di `app/modules/repos/models.py`

```python
from sqlalchemy import UniqueConstraint

class RepoLike(Base):
    __tablename__ = "repo_likes"
    __table_args__ = (UniqueConstraint("user_id", "repo_id", name="uq_user_repo_like"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"lik_{uuid.uuid4().hex[:12]}")
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    repo_id: Mapped[str] = mapped_column(ForeignKey("repos.id"), index=True)
```

## 11.3 Diskusi per-aset — perluas `Thread` di `app/modules/community/models.py`

Tambahkan kolom opsional:

```python
repo_id: Mapped[str | None] = mapped_column(ForeignKey("repos.id"), nullable=True, index=True)
```

Utas dengan `repo_id` = diskusi aset; `repo_id` null = forum umum.

## 11.4 Migrasi

```bash
docker compose exec backend alembic revision --autogenerate -m "repo likes and per-asset discussions"
docker compose exec backend alembic upgrade head
```

## 11.5 Endpoint like — tambahkan di `app/modules/repos/router.py`

```python
from app.core.deps import get_current_user, get_current_user_optional
from app.modules.repos.models import Repo, RepoLike

async def _get_repo(db, repo_id) -> Repo:
    r = (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none()
    if not r:
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    return r


@router.post("/repos/{repo_id}/like")
async def like_repo(repo_id: str, user: User = Depends(get_current_user),
                    db: AsyncSession = Depends(get_db)):
    r = await _get_repo(db, repo_id)
    found = (await db.execute(select(RepoLike).where(
        RepoLike.user_id == user.id, RepoLike.repo_id == repo_id))).scalar_one_or_none()
    if not found:
        db.add(RepoLike(user_id=user.id, repo_id=repo_id))
        r.likes += 1
        await db.commit()
    return {"liked": True, "likes": r.likes}


@router.delete("/repos/{repo_id}/like")
async def unlike_repo(repo_id: str, user: User = Depends(get_current_user),
                      db: AsyncSession = Depends(get_db)):
    r = await _get_repo(db, repo_id)
    found = (await db.execute(select(RepoLike).where(
        RepoLike.user_id == user.id, RepoLike.repo_id == repo_id))).scalar_one_or_none()
    if found:
        await db.delete(found)
        r.likes = max(0, r.likes - 1)
        await db.commit()
    return {"liked": False, "likes": r.likes}
```

Sertakan status `liked` di detail aset — ubah `detail_ep` dalam fungsi `_register` agar memakai auth-opsional:

```python
async def detail_ep(owner: str, name: str,
                    user: User | None = Depends(get_current_user_optional),
                    db: AsyncSession = Depends(get_db)):
    data = await _detail(db, kind, owner, name)        # _detail sudah ada (Langkah 5)
    liked = False
    if user:
        liked = bool((await db.execute(select(RepoLike).where(
            RepoLike.user_id == user.id, RepoLike.repo_id == data["id"]))).scalar_one_or_none())
    return {**data, "liked": liked}
```

## 11.6 Endpoint diskusi — tambahkan di `app/modules/community/router.py`

```python
from app.modules.repos.models import Repo

@router.get("/repos/{repo_id}/discussions")
async def repo_discussions(repo_id: str, p: PageParams = Depends(page_params),
                           db: AsyncSession = Depends(get_db)):
    stmt = select(Thread).where(Thread.repo_id == repo_id).order_by(Thread.last_activity_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_summary(t, await _replies(db, t.id)) for t in rows], total, p)


@router.post("/repos/{repo_id}/discussions", status_code=201)
async def create_repo_discussion(repo_id: str, body: dict, user: User = Depends(get_current_user),
                                 db: AsyncSession = Depends(get_db)):
    if not (await db.execute(select(Repo).where(Repo.id == repo_id))).scalar_one_or_none():
        raise ApiError(404, "not_found", "Aset tidak ditemukan")
    t = Thread(title=body["title"], author_id=user.id, body_md=body.get("body_md", ""),
               tags=body.get("tags", []), repo_id=repo_id)
    db.add(t); await db.commit(); await db.refresh(t)
    return await get_thread(t.id, db)   # get_thread sudah ada (Langkah 7)
```

Agar forum umum tidak tercampur diskusi aset, ubah `list_threads` (Langkah 7) menambahkan filter:

```python
stmt = select(Thread).where(Thread.repo_id.is_(None))
```

## 11.7 Pembaruan Kontrak (tambahkan ke Bagian 8 dokumen frontend)

- `RepoDetail` **+** `liked: boolean` (false bila tak login / belum disukai).

| Metode | Path | Auth | Body | Respons |
|---|---|---|---|---|
| POST | `/repos/{repo_id}/like` | ✓ | — | `{ liked: boolean, likes: number }` |
| DELETE | `/repos/{repo_id}/like` | ✓ | — | `{ liked: boolean, likes: number }` |
| GET | `/repos/{repo_id}/discussions` | — | `page, page_size` | `Paginated<ThreadSummary>` |
| POST | `/repos/{repo_id}/discussions` | ✓ | `{ title, body_md, tags }` | `ThreadDetail` |

Catatan: `GET /forum/threads` kini hanya mengembalikan utas umum (`repo_id` null).

## Selesai bila

- [ ] Like/unlike mengubah `likes` & mengembalikan `{ liked, likes }`; tidak bisa dobel-like (unik per user+aset).
- [ ] `RepoDetail` memuat `liked` sesuai pengguna login.
- [ ] `GET/POST /repos/{repo_id}/discussions` bekerja; utas aset tidak muncul di forum umum.
- [ ] Tanpa token, like/diskusi-create → `401`.
