# Langkah 37 — Tim & Kolaborasi

> **Tujuan:** Tim dengan peran, undangan & permintaan bergabung, dan aset yang dimiliki bersama tim — fondasi kolaborasi (dan prasyarat Ruang Ide). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 5/15 (repo), 29 (notifikasi), 33 (kategori, opsional).

## 37.1 Model — `app/modules/teams/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, ForeignKey, DateTime, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class Team(Base):
    __tablename__ = "teams"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"team_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    name: Mapped[str] = mapped_column(String)
    description: Mapped[str] = mapped_column(String, default="")
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    visibility: Mapped[str] = mapped_column(String, default="public")   # public | private
    created_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class TeamMember(Base):
    __tablename__ = "team_members"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member"),)
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"tmm_{uuid.uuid4().hex[:12]}")
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String, default="member")          # owner | admin | member
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class TeamInvite(Base):
    __tablename__ = "team_invites"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"tiv_{uuid.uuid4().hex[:12]}")
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)   # diundang
    invited_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String, default="pending")             # pending|accepted|declined
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class TeamJoinRequest(Base):
    __tablename__ = "team_join_requests"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"tjr_{uuid.uuid4().hex[:12]}")
    team_id: Mapped[str] = mapped_column(ForeignKey("teams.id"), index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="pending")             # pending|approved|rejected
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "teams"
docker compose exec backend alembic upgrade head
```

## 37.2 Helper — `app/modules/teams/deps.py`

```python
from sqlalchemy import select
from app.core.errors import ApiError
from app.modules.teams.models import Team, TeamMember

async def get_team(db, slug):
    t = (await db.execute(select(Team).where(Team.slug == slug))).scalar_one_or_none()
    if not t: raise ApiError(404, "not_found", "Tim tidak ditemukan")
    return t

async def membership(db, team_id, user_id):
    return (await db.execute(select(TeamMember).where(
        TeamMember.team_id == team_id, TeamMember.user_id == user_id))).scalar_one_or_none()

async def require_admin(db, team, user):
    m = await membership(db, team.id, user.id)
    if not m or m.role not in ("owner", "admin"):
        raise ApiError(403, "forbidden", "Butuh peran admin/owner tim")
    return m
```

## 37.3 Tim: CRUD & direktori — `app/modules/teams/router.py`

```python
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.categories.util import slugify
from app.modules.teams.models import Team, TeamMember, TeamInvite, TeamJoinRequest
from app.modules.teams.deps import get_team, membership, require_admin
from app.modules.users.models import User
from app.modules.notifications.service import notify

router = APIRouter(tags=["teams"])

async def _ser_member(db, m):
    u = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one()
    return {"username": u.username, "name": u.name, "avatar_url": u.avatar_url, "role": m.role}

@router.post("/teams", status_code=201)
async def create_team(body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    base = slugify(body["name"]); slug = base
    if (await db.execute(select(Team).where(Team.slug == slug))).scalar_one_or_none():
        slug = f"{base}-{__import__('uuid').uuid4().hex[:4]}"
    t = Team(slug=slug, name=body["name"].strip(), description=body.get("description", ""),
             visibility=body.get("visibility", "public"), created_by=user.id)
    db.add(t); await db.flush()
    db.add(TeamMember(team_id=t.id, user_id=user.id, role="owner"))
    await db.commit()
    return {"slug": t.slug}

@router.get("/teams")
async def list_teams(q: str | None = None, p: PageParams = Depends(page_params), db=Depends(get_db)):
    stmt = select(Team).where(Team.visibility == "public")
    if q: stmt = stmt.where(Team.name.ilike(f"%{q}%"))
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.order_by(Team.created_at.desc()).offset(p.offset).limit(p.page_size))).scalars().all()
    out = []
    for t in rows:
        n = (await db.execute(select(func.count()).select_from(TeamMember).where(TeamMember.team_id == t.id))).scalar_one()
        out.append({"slug": t.slug, "name": t.name, "description": t.description,
                    "avatar_url": t.avatar_url, "member_count": n})
    return paginated(out, total, p)

@router.get("/me/teams")
async def my_teams(user=Depends(get_current_user), db=Depends(get_db)):
    rows = (await db.execute(select(Team, TeamMember).join(TeamMember, TeamMember.team_id == Team.id)
            .where(TeamMember.user_id == user.id))).all()
    return {"items": [{"slug": t.slug, "name": t.name, "avatar_url": t.avatar_url, "role": m.role} for t, m in rows]}

@router.get("/teams/{slug}")
async def get_team_detail(slug: str, viewer=Depends(get_current_user_optional), db=Depends(get_db)):
    t = await get_team(db, slug)
    mem = await membership(db, t.id, viewer.id) if viewer else None
    if t.visibility == "private" and not mem:
        raise ApiError(403, "private", "Tim privat")
    members = (await db.execute(select(TeamMember).where(TeamMember.team_id == t.id))).scalars().all()
    return {"slug": t.slug, "name": t.name, "description": t.description, "avatar_url": t.avatar_url,
            "visibility": t.visibility, "my_role": mem.role if mem else None,
            "members": [await _ser_member(db, m) for m in members]}

@router.patch("/teams/{slug}")
async def update_team(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug); await require_admin(db, t, user)
    for k in ("name", "description", "avatar_url", "visibility"):
        if k in body: setattr(t, k, body[k])
    await db.commit(); return {"slug": t.slug}

@router.delete("/teams/{slug}", status_code=204)
async def delete_team(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug)
    m = await membership(db, t.id, user.id)
    if not m or m.role != "owner": raise ApiError(403, "forbidden", "Hanya owner")
    for tbl in (TeamMember, TeamInvite, TeamJoinRequest):
        await db.execute(tbl.__table__.delete().where(tbl.team_id == t.id))
    await db.delete(t); await db.commit()
```

## 37.4 Anggota: peran, keluar, transfer

```python
@router.patch("/teams/{slug}/members/{username}")
async def set_role(slug: str, username: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug); me = await require_admin(db, t, user)
    target_user = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    tm = await membership(db, t.id, target_user.id) if target_user else None
    if not tm: raise ApiError(404, "not_found", "Bukan anggota")
    new_role = body["role"]                                   # admin|member|owner(transfer)
    if new_role == "owner":                                   # transfer: hanya owner
        if me.role != "owner": raise ApiError(403, "forbidden", "Hanya owner bisa transfer")
        me.role = "admin"; tm.role = "owner"
    else:
        tm.role = new_role
    await db.commit(); return {"role": tm.role}

@router.delete("/teams/{slug}/members/{username}", status_code=204)
async def remove_member(slug: str, username: str, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug)
    target = (await db.execute(select(User).where(User.username == username))).scalar_one_or_none()
    tm = await membership(db, t.id, target.id) if target else None
    if not tm: raise ApiError(404, "not_found", "Bukan anggota")
    if target.id != user.id:                                 # keluar sendiri ATAU admin mengeluarkan
        await require_admin(db, t, user)
    if tm.role == "owner": raise ApiError(400, "owner", "Owner harus transfer dulu")
    await db.delete(tm); await db.commit()
```

## 37.5 Undangan (admin → user)

```python
@router.post("/teams/{slug}/invites", status_code=201)
async def invite(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug); await require_admin(db, t, user)
    target = (await db.execute(select(User).where(User.username == body["username"]))).scalar_one_or_none()
    if not target: raise ApiError(404, "not_found", "Pengguna tidak ditemukan")
    if await membership(db, t.id, target.id): raise ApiError(409, "member", "Sudah anggota")
    inv = TeamInvite(team_id=t.id, user_id=target.id, invited_by=user.id)
    db.add(inv); await db.commit()
    await notify(db, target.id, "team", f"Undangan tim: {t.name}", link="/me/teams", actor_id=user.id)
    return {"id": inv.id}

@router.get("/me/team-invites")
async def my_invites(user=Depends(get_current_user), db=Depends(get_db)):
    rows = (await db.execute(select(TeamInvite, Team).join(Team, Team.id == TeamInvite.team_id)
            .where(TeamInvite.user_id == user.id, TeamInvite.status == "pending"))).all()
    return {"items": [{"id": i.id, "team": {"slug": t.slug, "name": t.name}} for i, t in rows]}

@router.post("/me/team-invites/{iid}/accept")
async def accept_invite(iid: str, user=Depends(get_current_user), db=Depends(get_db)):
    inv = (await db.execute(select(TeamInvite).where(TeamInvite.id == iid, TeamInvite.user_id == user.id))).scalar_one_or_none()
    if not inv or inv.status != "pending": raise ApiError(404, "not_found", "Undangan tidak valid")
    inv.status = "accepted"
    if not await membership(db, inv.team_id, user.id):
        db.add(TeamMember(team_id=inv.team_id, user_id=user.id, role="member"))
    await db.commit(); return {"joined": True}

@router.post("/me/team-invites/{iid}/decline")
async def decline_invite(iid: str, user=Depends(get_current_user), db=Depends(get_db)):
    inv = (await db.execute(select(TeamInvite).where(TeamInvite.id == iid, TeamInvite.user_id == user.id))).scalar_one_or_none()
    if inv: inv.status = "declined"; await db.commit()
    return {"ok": True}
```

## 37.6 Permintaan bergabung (user → tim publik)

```python
@router.post("/teams/{slug}/join-request", status_code=201)
async def join_request(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug)
    if t.visibility != "public": raise ApiError(403, "private", "Tim privat — perlu undangan")
    if await membership(db, t.id, user.id): raise ApiError(409, "member", "Sudah anggota")
    jr = TeamJoinRequest(team_id=t.id, user_id=user.id); db.add(jr); await db.commit()
    owner = (await db.execute(select(TeamMember).where(TeamMember.team_id == t.id, TeamMember.role == "owner"))).scalar_one_or_none()
    if owner: await notify(db, owner.user_id, "team", f"Permintaan bergabung: {t.name}", link=f"/teams/{t.slug}/requests", actor_id=user.id)
    return {"id": jr.id}

@router.get("/teams/{slug}/join-requests")
async def list_requests(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug); await require_admin(db, t, user)
    rows = (await db.execute(select(TeamJoinRequest, User).join(User, User.id == TeamJoinRequest.user_id)
            .where(TeamJoinRequest.team_id == t.id, TeamJoinRequest.status == "pending"))).all()
    return {"items": [{"id": r.id, "user": {"username": u.username, "name": u.name, "avatar_url": u.avatar_url}} for r, u in rows]}

@router.post("/teams/{slug}/join-requests/{rid}/{decision}")
async def decide_request(slug: str, rid: str, decision: str, user=Depends(get_current_user), db=Depends(get_db)):
    t = await get_team(db, slug); await require_admin(db, t, user)
    jr = (await db.execute(select(TeamJoinRequest).where(TeamJoinRequest.id == rid, TeamJoinRequest.team_id == t.id))).scalar_one_or_none()
    if not jr or jr.status != "pending": raise ApiError(404, "not_found", "Permintaan tidak valid")
    if decision == "approve":
        jr.status = "approved"
        if not await membership(db, t.id, jr.user_id):
            db.add(TeamMember(team_id=t.id, user_id=jr.user_id, role="member"))
        await notify(db, jr.user_id, "team", f"Diterima di tim {t.name}", link=f"/teams/{t.slug}")
    else:
        jr.status = "rejected"
    await db.commit(); return {"status": jr.status}
```

Wire router di `main.py`.

## 37.7 Aset milik tim (kolaborasi)

Tambah ke `Repo` (dan `Notebook`):

```python
team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
```

Migrasi lagi. Perluas izin edit (ganti `_owned_repo` Langkah 15):

```python
async def _can_edit_repo(db, repo, user):
    if repo.owner_id == user.id: return True
    if repo.team_id:
        from app.modules.teams.deps import membership
        if await membership(db, repo.team_id, user.id): return True
    if user.role in ("moderator", "superadmin"): return True
    raise ApiError(403, "forbidden", "Tidak boleh mengubah aset ini")
```

Saat create: terima `team_id` opsional (pembuat harus anggota tim). Sertakan `team: {slug,name}` di summary/detail bila ada. (Replikasi pola untuk Notebook.)

## 37.8 Pembaruan Kontrak (Bagian 8)

- Entitas `Team { slug, name, description, avatar_url, visibility, my_role?, members:[{username,name,avatar_url,role}] }`.
- Summary aset **+** `team: {slug,name}|null`; create menerima `team_id`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST/GET | `/teams` | ✓/— | buat / direktori publik |
| GET | `/me/teams` | ✓ | tim saya |
| GET/PATCH/DELETE | `/teams/{slug}` | — / admin / owner | detail/ubah/hapus |
| PATCH/DELETE | `/teams/{slug}/members/{username}` | admin | peran / keluar-keluarkan |
| POST/GET | `/teams/{slug}/invites`, `/me/team-invites` | admin / ✓ | undang / undangan saya |
| POST | `/me/team-invites/{id}/accept\|decline` | ✓ | tanggapi undangan |
| POST/GET | `/teams/{slug}/join-request(s)` | ✓ / admin | minta gabung / kelola |
| POST | `/teams/{slug}/join-requests/{id}/{approve\|reject}` | admin | putuskan |

## Selesai bila

- [ ] Buat tim (pembuat = owner); direktori publik & "tim saya" jalan.
- [ ] Peran (owner/admin/member): ubah peran, transfer owner, keluar/keluarkan; owner tak bisa dikeluarkan tanpa transfer.
- [ ] Undangan: kirim → notifikasi → terima/tolak; permintaan gabung (tim publik) → notifikasi owner → setujui/tolak.
- [ ] Aset bisa dimiliki tim; semua anggota dapat mengeditnya; non-anggota tidak.
