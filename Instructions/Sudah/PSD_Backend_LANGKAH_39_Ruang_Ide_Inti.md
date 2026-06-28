# Langkah 39 — Ruang Ide: Inti & Framing

> **Tujuan:** Fondasi Ruang Ide — buat ruang (otomatis tim), join, fase framing (komponen masalah, time-boxed), master menutup. State `draft→open→framing→closed`. **Kerjakan hanya langkah ini.** Belum ada AI/data (Langkah 40). Prasyarat: Tim (37), Kategori (33), Notifikasi (29). Acuan: Cetak Biru Ruang Ide.

## 39.1 Model — `app/modules/rooms/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class IdeaRoom(Base):
    __tablename__ = "idea_rooms"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"room_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    title: Mapped[str] = mapped_column(String)
    pitch_md: Mapped[str] = mapped_column(String, default="")
    founder_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    category_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True, index=True)
    subcategory_id: Mapped[str | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft", index=True)
    # draft|open|framing|closed|generating|solving|submitted|finished|challenged
    max_members: Mapped[int | None] = mapped_column(Integer, nullable=True)
    framing_deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # field tahap lanjut (Langkah 40+), nullable sekarang:
    data_mode: Mapped[str | None] = mapped_column(String, nullable=True)
    synthesis_job_id: Mapped[str | None] = mapped_column(String, nullable=True)
    dataset_repo_slug: Mapped[str | None] = mapped_column(String, nullable=True)
    solution_template: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class ProblemComponent(Base):
    __tablename__ = "problem_components"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"pcm_{uuid.uuid4().hex[:12]}")
    room_id: Mapped[str] = mapped_column(ForeignKey("idea_rooms.id"), index=True)
    author_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    kind: Mapped[str] = mapped_column(String)   # context|constraint|goal|data_need|metric
    content_md: Mapped[str] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "idea rooms"
docker compose exec backend alembic upgrade head
```

## 39.2 Helper — `app/modules/rooms/deps.py`

```python
from sqlalchemy import select
from app.core.errors import ApiError
from app.modules.rooms.models import IdeaRoom
from app.modules.teams.deps import membership      # Langkah 37
from app.modules.categories.models import Category

async def get_room(db, slug):
    r = (await db.execute(select(IdeaRoom).where(IdeaRoom.slug == slug))).scalar_one_or_none()
    if not r: raise ApiError(404, "not_found", "Ruang tidak ditemukan")
    return r

async def require_master(db, room, user):           # master = owner/admin tim ruang
    m = await membership(db, room.team_id, user.id)
    if not m or m.role not in ("owner", "admin"):
        raise ApiError(403, "forbidden", "Hanya master room")
    return m

async def resolve_category(db, cat_slug, sub_slug):
    cat = sub = None
    if cat_slug:
        cat = (await db.execute(select(Category).where(Category.slug == cat_slug, Category.parent_id.is_(None)))).scalar_one_or_none()
        if not cat: raise ApiError(422, "bad_category", "Kategori tidak dikenal")
    if sub_slug:
        sub = (await db.execute(select(Category).where(Category.slug == sub_slug))).scalar_one_or_none()
        if not sub or (cat and sub.parent_id != cat.id):
            raise ApiError(422, "bad_subcategory", "Subkategori tidak cocok")
    return (cat.id if cat else None), (sub.id if sub else None)
```

## 39.3 Router — `app/modules/rooms/router.py`

```python
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.categories.util import slugify
from app.modules.rooms.models import IdeaRoom, ProblemComponent
from app.modules.rooms.deps import get_room, require_master, resolve_category
from app.modules.teams.models import Team, TeamMember
from app.modules.teams.deps import membership
from app.modules.users.models import User
from app.modules.notifications.service import notify

router = APIRouter(tags=["idea-rooms"])
KINDS = {"context", "constraint", "goal", "data_need", "metric"}

async def _member_count(db, team_id):
    return (await db.execute(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == team_id))).scalar_one()

# ---- buat ruang (otomatis tim) ----
@router.post("/idea-rooms", status_code=201)
async def create_room(body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    base = slugify(body["title"])
    tslug = base
    if (await db.execute(select(Team).where(Team.slug == tslug))).scalar_one_or_none():
        tslug = f"{base}-{uuid.uuid4().hex[:4]}"
    team = Team(slug=tslug, name=body.get("team_name") or body["title"],
                visibility=body.get("visibility", "public"), created_by=user.id)
    db.add(team); await db.flush()
    db.add(TeamMember(team_id=team.id, user_id=user.id, role="owner"))
    cat_id, sub_id = await resolve_category(db, body.get("category"), body.get("subcategory"))
    rslug = base
    if (await db.execute(select(IdeaRoom).where(IdeaRoom.slug == rslug))).scalar_one_or_none():
        rslug = f"{base}-{uuid.uuid4().hex[:4]}"
    room = IdeaRoom(slug=rslug, title=body["title"].strip(), pitch_md=body.get("pitch_md", ""),
                    founder_id=user.id, team_id=team.id, category_id=cat_id, subcategory_id=sub_id,
                    status="draft", max_members=body.get("max_members"))
    db.add(room); await db.commit()
    return {"slug": room.slug}

# ---- direktori & detail ----
def _summary(r, members):
    return {"slug": r.slug, "title": r.title, "status": r.status,
            "member_count": members, "max_members": r.max_members,
            "framing_deadline": r.framing_deadline}

@router.get("/idea-rooms")
async def list_rooms(status: str | None = None, category: str | None = None,
                     p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(IdeaRoom).join(Team, Team.id == IdeaRoom.team_id).where(Team.visibility == "public")
    if status: stmt = stmt.where(IdeaRoom.status == status)
    stmt = stmt.order_by(IdeaRoom.created_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    out = [_summary(r, await _member_count(db, r.team_id)) for r in rows]
    return paginated(out, total, p)

@router.get("/idea-rooms/{slug}")
async def get_room_detail(slug: str, viewer=Depends(get_current_user_optional), db=Depends(get_db)):
    r = await get_room(db, slug)
    team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
    my = await membership(db, r.team_id, viewer.id) if viewer else None
    if team.visibility == "private" and not my:
        raise ApiError(403, "private", "Ruang privat")
    members = (await db.execute(select(TeamMember, User).join(User, User.id == TeamMember.user_id)
               .where(TeamMember.team_id == r.team_id))).all()
    comp = (await db.execute(select(func.count()).select_from(ProblemComponent).where(ProblemComponent.room_id == r.id))).scalar_one()
    return {**_summary(r, len(members)), "pitch_md": r.pitch_md, "team_slug": team.slug,
            "my_role": my.role if my else None, "components_count": comp,
            "members": [{"username": u.username, "name": u.name, "avatar_url": u.avatar_url, "role": m.role} for m, u in members]}

# ---- transisi (master) ----
@router.post("/idea-rooms/{slug}/publish")
async def publish(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status != "draft": raise ApiError(400, "invalid_state", "Hanya draft bisa diterbitkan")
    r.status = "open"; await db.commit(); return {"status": r.status}

@router.post("/idea-rooms/{slug}/start-framing")
async def start_framing(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status != "open": raise ApiError(400, "invalid_state", "Mulai framing hanya dari status open")
    hours = int(body.get("framing_hours", 72))
    r.status = "framing"; r.framing_deadline = datetime.now(timezone.utc) + timedelta(hours=hours)
    await db.commit(); return {"status": r.status, "framing_deadline": r.framing_deadline}

@router.post("/idea-rooms/{slug}/close")
async def close_room(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status not in ("open", "framing"): raise ApiError(400, "invalid_state", "Hanya open/framing bisa ditutup")
    r.status = "closed"; await db.commit(); return {"status": r.status}

# ---- join (open/framing) ----
@router.post("/idea-rooms/{slug}/join")
async def join_room(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug)
    if r.status not in ("open", "framing"): raise ApiError(400, "closed", "Pendaftaran ruang tertutup")
    team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
    if await membership(db, r.team_id, user.id): return {"joined": True}
    if team.visibility == "private": raise ApiError(403, "private", "Ruang privat — perlu undangan")
    if r.max_members and await _member_count(db, r.team_id) >= r.max_members:
        raise ApiError(409, "full", "Anggota sudah penuh")
    db.add(TeamMember(team_id=r.team_id, user_id=user.id, role="member")); await db.commit()
    await notify(db, r.founder_id, "room", f"Anggota baru di ruang: {r.title}", link=f"/idea-rooms/{r.slug}", actor_id=user.id)
    return {"joined": True}

# ---- komponen masalah (framing) ----
@router.post("/idea-rooms/{slug}/components", status_code=201)
async def add_component(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug)
    if r.status != "framing": raise ApiError(400, "invalid_state", "Bukan fase framing")
    if r.framing_deadline and datetime.now(timezone.utc) > r.framing_deadline:
        raise ApiError(400, "deadline", "Tenggang framing telah berakhir")
    if not await membership(db, r.team_id, user.id): raise ApiError(403, "forbidden", "Bukan anggota ruang")
    if body.get("kind") not in KINDS: raise ApiError(422, "bad_kind", "Jenis komponen tidak valid")
    c = ProblemComponent(room_id=r.id, author_id=user.id, kind=body["kind"], content_md=body["content_md"])
    db.add(c); await db.commit(); return {"id": c.id}

@router.get("/idea-rooms/{slug}/components")
async def list_components(slug: str, db=Depends(get_db)):
    r = await get_room(db, slug)
    rows = (await db.execute(select(ProblemComponent, User).join(User, User.id == ProblemComponent.author_id)
            .where(ProblemComponent.room_id == r.id).order_by(ProblemComponent.created_at))).all()
    return {"items": [{"id": c.id, "kind": c.kind, "content_md": c.content_md,
                       "author": {"username": u.username, "avatar_url": u.avatar_url}} for c, u in rows]}

@router.delete("/idea-rooms/{slug}/components/{cid}", status_code=204)
async def delete_component(slug: str, cid: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug)
    c = (await db.execute(select(ProblemComponent).where(ProblemComponent.id == cid, ProblemComponent.room_id == r.id))).scalar_one_or_none()
    if not c: raise ApiError(404, "not_found", "Komponen tidak ditemukan")
    if c.author_id != user.id:
        await require_master(db, r, user)       # penulis atau master
    await db.delete(c); await db.commit()
```

Wire router di `main.py`. Manajemen anggota lanjutan (keluarkan/atur peran/undang) **memakai ulang endpoint Tim (Langkah 37)** lewat `team_slug`.

## 39.4 Pembaruan Kontrak (Bagian 8)

- Entitas `IdeaRoom { slug, title, pitch_md, status, member_count, max_members, framing_deadline, team_slug, my_role, components_count, members[] }`; `ProblemComponent { id, kind, content_md, author }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST/GET | `/idea-rooms` | ✓/— | buat (auto-tim) / direktori publik |
| GET | `/idea-rooms/{slug}` | opsional | detail (privat → anggota) |
| POST | `/idea-rooms/{slug}/publish` | master | draft→open |
| POST | `/idea-rooms/{slug}/start-framing` | master | open→framing (`framing_hours`) |
| POST | `/idea-rooms/{slug}/close` | master | open/framing→closed |
| POST | `/idea-rooms/{slug}/join` | ✓ | gabung (open/framing) |
| POST/GET | `/idea-rooms/{slug}/components` | anggota/— | tambah/daftar komponen (framing) |
| DELETE | `/idea-rooms/{slug}/components/{id}` | penulis/master | hapus komponen |

## Selesai bila

- [ ] Buat ruang otomatis membuat tim (pendiri = master/owner).
- [ ] Transisi `draft→open→framing→closed` hanya oleh master; status divalidasi.
- [ ] Join hanya saat open/framing; hormati `max_members` & ruang privat.
- [ ] Komponen masalah hanya ditambah anggota saat framing & sebelum tenggang.
- [ ] Manajemen anggota lanjutan berfungsi via endpoint Tim (Langkah 37).
