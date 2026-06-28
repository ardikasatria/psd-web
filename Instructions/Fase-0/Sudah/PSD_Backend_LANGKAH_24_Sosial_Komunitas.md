# Langkah 24 — Sosial Komunitas (Follow + Feed Postingan)

> **Tujuan:** Jejaring follow antar-akun (user/organisasi) dan feed sosial ala Facebook/Hugging Face — postingan berisi teks, foto, dan **berbagi aset PSD**, dengan suka & komentar. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 7, 13 (storage).
>
> **Catatan:** ini melengkapi forum terstruktur (Langkah 7), bukan menggantinya. Forum = diskusi/Q&A; feed = interaksi sosial cepat. Karena organisasi juga akun `User`, satu tabel follow mencakup user↔user, user↔org, org↔org.

## 24.1 Model — `app/modules/social/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, JSON, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.db import Base
from app.modules.users.models import User

def _id(p): return lambda: f"{p}_{uuid.uuid4().hex[:12]}"

class Follow(Base):
    __tablename__ = "follows"
    __table_args__ = (UniqueConstraint("follower_id", "following_id", name="uq_follow"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("fol"))
    follower_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    following_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Post(Base):
    __tablename__ = "social_posts"      # BEDA dari tabel "posts" (forum) — jangan bentrok
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("sps"))
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    body_md: Mapped[str] = mapped_column(String, default="")
    images: Mapped[list] = mapped_column(JSON, default=list)        # list URL gambar
    asset_kind: Mapped[str | None] = mapped_column(String, nullable=True)   # project|dataset|model
    asset_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")

class PostLike(Base):
    __tablename__ = "social_post_likes"
    __table_args__ = (UniqueConstraint("user_id", "post_id", name="uq_post_like"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("spl"))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    post_id: Mapped[str] = mapped_column(ForeignKey("social_posts.id"), index=True)

class PostComment(Base):
    __tablename__ = "social_post_comments"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=_id("spc"))
    post_id: Mapped[str] = mapped_column(ForeignKey("social_posts.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    body_md: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    author: Mapped[User] = relationship(lazy="selectin")
```

Migrasi (impor model di `alembic/env.py`):

```bash
docker compose exec backend alembic revision --autogenerate -m "social follow and feed"
docker compose exec backend alembic upgrade head
```

## 24.2 Follow — `app/modules/social/router.py`

```python
router = APIRouter(tags=["social"])

def _owner(u):
    return {"username": u.username, "type": "org" if u.role == "org_admin" else "user",
            "avatar_url": u.avatar_url, "is_official": u.is_official}

async def _user_by_name(db, username):
    u = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    if not u: raise ApiError(404, "not_found", "Akun tidak ditemukan")
    return u

@router.post("/users/{username}/follow", status_code=201)
async def follow(username: str, user=Depends(get_current_user), db=Depends(get_db)):
    target = await _user_by_name(db, username)
    if target.id == user.id:
        raise ApiError(400, "self", "Tidak bisa mengikuti diri sendiri")
    if not (await db.execute(select(Follow).where(Follow.follower_id == user.id,
            Follow.following_id == target.id))).scalar_one_or_none():
        db.add(Follow(follower_id=user.id, following_id=target.id)); await db.commit()
    return {"following": True}

@router.delete("/users/{username}/follow")
async def unfollow(username: str, user=Depends(get_current_user), db=Depends(get_db)):
    target = await _user_by_name(db, username)
    f = (await db.execute(select(Follow).where(Follow.follower_id == user.id,
         Follow.following_id == target.id))).scalar_one_or_none()
    if f: await db.delete(f); await db.commit()
    return {"following": False}

@router.get("/users/{username}/followers")
async def followers(username: str, p: PageParams = Depends(page_params), db=Depends(get_db)):
    t = await _user_by_name(db, username)
    stmt = select(User).join(Follow, Follow.follower_id == User.id).where(Follow.following_id == t.id)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_owner(u) for u in rows], total, p)

@router.get("/users/{username}/following")
async def following(username: str, p: PageParams = Depends(page_params), db=Depends(get_db)):
    t = await _user_by_name(db, username)
    stmt = select(User).join(Follow, Follow.following_id == User.id).where(Follow.follower_id == t.id)
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([_owner(u) for u in rows], total, p)
```

Di `GET /users/{username}` (Langkah 7) tambahkan `followers_count`, `following_count`, dan `is_following` (pakai `get_current_user_optional`).

## 24.3 Unggah gambar postingan

```python
import uuid
from fastapi import UploadFile, File
from app.core.storage import upload_public   # bucket psd-media (Langkah 13)

IMG = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}

@router.post("/posts/images")
async def upload_post_image(file: UploadFile = File(...), user=Depends(get_current_user), db=Depends(get_db)):
    ext = IMG.get(file.content_type)
    if not ext: raise ApiError(422, "invalid_file", "Format jpg/png/webp")
    data = await file.read()
    if len(data) > 5 * 1024 * 1024: raise ApiError(413, "too_large", "Maks 5 MB")
    url = upload_public(f"posts/{user.id}/{uuid.uuid4().hex}.{ext}", data, file.content_type)
    return {"url": url}
```

## 24.4 Postingan & feed

```python
from sqlalchemy import or_

def _post(p, liked=False):
    d = {"id": p.id, "author": _owner(p.author), "body_md": p.body_md, "images": p.images,
         "like_count": p.like_count, "comment_count": p.comment_count, "created_at": p.created_at,
         "liked": liked, "asset": None}
    if p.asset_kind and p.asset_slug:
        d["asset"] = {"kind": p.asset_kind, "slug": p.asset_slug}
    return d

@router.post("/posts", status_code=201)
async def create_post(body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    # batas harian & gambar ditegakkan di Langkah 25 (gamifikasi/perks)
    p = Post(author_id=user.id, body_md=body.get("body_md", ""), images=body.get("images", []),
             asset_kind=(body.get("asset") or {}).get("kind"),
             asset_slug=(body.get("asset") or {}).get("slug"))
    db.add(p); await db.commit(); await db.refresh(p)
    return _post(p)

async def _liked_ids(db, user, post_ids):
    if not user or not post_ids: return set()
    rows = (await db.execute(select(PostLike.post_id).where(
        PostLike.user_id == user.id, PostLike.post_id.in_(post_ids)))).scalars().all()
    return set(rows)

@router.get("/feed")
async def feed(scope: str = "following", user=Depends(get_current_user),
               p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(Post)
    if scope == "following":
        sub = select(Follow.following_id).where(Follow.follower_id == user.id)
        stmt = stmt.where(or_(Post.author_id.in_(sub), Post.author_id == user.id))
    stmt = stmt.order_by(Post.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    liked = await _liked_ids(db, user, [r.id for r in rows])
    return paginated([_post(r, r.id in liked) for r in rows], total, p)

@router.get("/users/{username}/posts")
async def user_posts(username: str, viewer=Depends(get_current_user_optional),
                     p: PageParams = Depends(page_params), db=Depends(get_db)):
    t = await _user_by_name(db, username)
    stmt = select(Post).where(Post.author_id == t.id).order_by(Post.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    liked = await _liked_ids(db, viewer, [r.id for r in rows])
    return paginated([_post(r, r.id in liked) for r in rows], total, p)

@router.delete("/posts/{post_id}", status_code=204)
async def delete_post(post_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if p and (p.author_id == user.id or user.role == "admin"):
        await db.delete(p); await db.commit()
```

## 24.5 Suka & komentar

```python
@router.post("/posts/{post_id}/like")
async def like_post(post_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not p: raise ApiError(404, "not_found", "Postingan tidak ditemukan")
    if not (await db.execute(select(PostLike).where(PostLike.user_id == user.id,
            PostLike.post_id == post_id))).scalar_one_or_none():
        db.add(PostLike(user_id=user.id, post_id=post_id)); p.like_count += 1; await db.commit()
    return {"liked": True, "like_count": p.like_count}

@router.delete("/posts/{post_id}/like")
async def unlike_post(post_id: str, user=Depends(get_current_user), db=Depends(get_db)):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    f = (await db.execute(select(PostLike).where(PostLike.user_id == user.id,
         PostLike.post_id == post_id))).scalar_one_or_none()
    if f: await db.delete(f); p.like_count = max(0, p.like_count - 1); await db.commit()
    return {"liked": False, "like_count": p.like_count}

@router.get("/posts/{post_id}/comments")
async def comments(post_id: str, p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(PostComment).where(PostComment.post_id == post_id).order_by(PostComment.created_at.asc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([{"id": c.id, "author": _owner(c.author), "body_md": c.body_md,
                       "created_at": c.created_at} for c in rows], total, p)

@router.post("/posts/{post_id}/comments", status_code=201)
async def add_comment(post_id: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    p = (await db.execute(select(Post).where(Post.id == post_id))).scalar_one_or_none()
    if not p: raise ApiError(404, "not_found", "Postingan tidak ditemukan")
    c = PostComment(post_id=post_id, author_id=user.id, body_md=body["body_md"])
    db.add(c); p.comment_count += 1; await db.commit(); await db.refresh(c)
    return {"id": c.id, "author": _owner(user), "body_md": c.body_md, "created_at": c.created_at}
```

Wire router social di `main.py`.

## 24.6 Pembaruan Kontrak (Bagian 8)

- Profil **+** `followers_count`, `following_count`, `is_following: boolean`.
- Entitas `Post { id, author: OwnerRef, body_md, images: string[], asset: {kind,slug}|null, like_count, comment_count, liked, created_at }`, `Comment { id, author, body_md, created_at }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST/DELETE | `/users/{username}/follow` | ✓ | ikuti/berhenti |
| GET | `/users/{username}/followers` \| `/following` | — | `Paginated<OwnerRef>` |
| POST | `/posts/images` | ✓ | multipart → `{ url }` |
| POST | `/posts` | ✓ | `{ body_md, images[], asset? }` |
| GET | `/feed?scope=following\|all` | ✓ | `Paginated<Post>` |
| GET | `/users/{username}/posts` | — | `Paginated<Post>` |
| DELETE | `/posts/{id}` | penulis/admin | — |
| POST/DELETE | `/posts/{id}/like` | ✓ | `{ liked, like_count }` |
| GET/POST | `/posts/{id}/comments` | (POST ✓) | `Paginated<Comment>` |

## Selesai bila

- [ ] Follow/unfollow bekerja antar-akun (termasuk organisasi); profil menampilkan jumlah & `is_following`.
- [ ] Buat postingan (teks + gambar + lampiran aset), feed "following" & "all" tampil.
- [ ] Suka & komentar memperbarui hitungan; `liked` akurat.
- [ ] Hapus postingan oleh penulis/admin.
- [ ] Tabel sosial tidak bentrok dengan tabel forum.
