# Langkah 41 — Ruang Ide: Ruang Solusi & Submit

> **Tujuan:** Fase solusi — template solusi, (untuk collect) unggah data tim, submit notebook+hasil, finish, bagikan aset ke proyek, dan gamifikasi tim. Transisi `solving → submitted → finished`. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 39, 40, 37 (aset team-owned), 25 (gamifikasi).

## 41.1 Model — `app/modules/rooms/models.py`

```python
class RoomSubmission(Base):
    __tablename__ = "room_submissions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"rsb_{uuid.uuid4().hex[:12]}")
    room_id: Mapped[str] = mapped_column(ForeignKey("idea_rooms.id"), unique=True, index=True)
    submitted_by: Mapped[str] = mapped_column(ForeignKey("users.id"))
    notebook_id: Mapped[str | None] = mapped_column(ForeignKey("notebooks.id"), nullable=True)
    result_summary_md: Mapped[str] = mapped_column(String, default="")
    asset_refs: Mapped[list] = mapped_column(JSON, default=list)   # [{type, slug}]
    metrics: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "room submission"
docker compose exec backend alembic upgrade head
```

## 41.2 Gamifikasi — tambah ke registry (Langkah 25)

`POINTS["room_finished"] = 30`. `BADGES` **+** `"pemecah_masalah"` ("Pemecah Masalah", selesai 1 ruang) & `"arsitek_ide"` ("Arsitek Ide", master menyelesaikan ruang).

## 41.3 Template solusi — `app/modules/rooms/router.py`

```python
DEFAULT_TEMPLATE = {"sections": [
    {"key": "eksplorasi", "title": "Eksplorasi Data"},
    {"key": "pemrosesan", "title": "Pemrosesan & Fitur"},
    {"key": "pemodelan",  "title": "Pemodelan"},
    {"key": "evaluasi",   "title": "Evaluasi & Hasil"},
]}

@router.get("/idea-rooms/{slug}/solution-template")
async def get_template(slug: str, db=Depends(get_db)):
    r = await get_room(db, slug)
    return r.solution_template or DEFAULT_TEMPLATE

@router.patch("/idea-rooms/{slug}/solution-template")
async def set_template(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    r.solution_template = body.get("template", DEFAULT_TEMPLATE)
    await db.commit(); return r.solution_template
```

## 41.4 Unggah data tim (mode collect) — data tak terstruktur

```python
import uuid
from fastapi import UploadFile, File
from app.core.storage import upload_asset
from app.modules.teams.models import Team
from app.modules.teams.deps import membership
from app.modules.repos.models import Repo
from app.modules.categories.util import slugify

@router.post("/idea-rooms/{slug}/upload-data", status_code=201)
async def upload_room_data(slug: str, file: UploadFile = File(...),
                           user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug)
    if r.status != "solving" or r.data_mode != "collect":
        raise ApiError(400, "invalid_state", "Unggah data hanya untuk ruang collect saat solving")
    if not await membership(db, r.team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota ruang")
    data = await file.read()
    if len(data) > 100 * 1024 * 1024: raise ApiError(413, "too_large", "Maks 100 MB")
    team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
    fname = file.filename or "data"
    url = upload_asset(f"rooms/{slug}/{uuid.uuid4().hex}-{fname}", data, file.content_type or "application/octet-stream")
    name = slugify(fname.rsplit(".", 1)[0]) or "data"
    ds_slug = f"{team.slug}/{name}"
    if (await db.execute(select(Repo).where(Repo.slug == ds_slug))).scalar_one_or_none():
        ds_slug = f"{ds_slug}-{uuid.uuid4().hex[:4]}"
    repo = Repo(kind="dataset", owner_id=r.founder_id, team_id=r.team_id, name=name, slug=ds_slug,
                description="Data dikumpulkan tim (ruang ide).", visibility="private", room_id=r.id,
                files=[{"path": fname, "url": url, "size_bytes": len(data),
                        "type": file.content_type or "application/octet-stream"}])
    db.add(repo); await db.commit()
    r.dataset_repo_slug = ds_slug; await db.commit()
    return {"dataset_slug": ds_slug}
```

## 41.5 Submit & finish

```python
from app.modules.rooms.models import RoomSubmission
from app.modules.users.models import User
from app.modules.teams.models import TeamMember
from app.modules.gamification.service import award_reputation, award_badge
from app.modules.notifications.service import notify

@router.post("/idea-rooms/{slug}/submit", status_code=201)
async def submit_solution(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status != "solving": raise ApiError(400, "invalid_state", "Submit hanya saat solving")
    sub = (await db.execute(select(RoomSubmission).where(RoomSubmission.room_id == r.id))).scalar_one_or_none()
    if not sub:
        sub = RoomSubmission(room_id=r.id, submitted_by=user.id); db.add(sub)
    sub.notebook_id = body.get("notebook_id")
    sub.result_summary_md = body.get("result_summary_md", "")
    sub.asset_refs = body.get("asset_refs", [])
    sub.metrics = body.get("metrics", {})
    r.status = "submitted"
    await db.commit()
    return {"id": sub.id, "status": r.status}

@router.get("/idea-rooms/{slug}/submission")
async def get_submission(slug: str, db=Depends(get_db)):
    r = await get_room(db, slug)
    s = (await db.execute(select(RoomSubmission).where(RoomSubmission.room_id == r.id))).scalar_one_or_none()
    if not s: raise ApiError(404, "not_found", "Belum ada submission")
    return {"result_summary_md": s.result_summary_md, "notebook_id": s.notebook_id,
            "asset_refs": s.asset_refs, "metrics": s.metrics, "submitted_by": s.submitted_by}

@router.post("/idea-rooms/{slug}/finish")
async def finish_room(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); master = await require_master(db, r, user)
    if r.status != "submitted": raise ApiError(400, "invalid_state", "Finish hanya saat submitted")
    sub = (await db.execute(select(RoomSubmission).where(RoomSubmission.room_id == r.id))).scalar_one_or_none()

    # bagikan aset ke proyek (publik/privat)
    if body.get("publish_assets") and sub:
        vis = body.get("visibility", "public")
        for ref in sub.asset_refs:
            if ref.get("type") in ("dataset", "model", "project"):
                repo = (await db.execute(select(Repo).where(Repo.slug == ref["slug"]))).scalar_one_or_none()
                if repo: repo.visibility = vis

    r.status = "finished"
    await db.commit()

    # gamifikasi seluruh anggota
    members = (await db.execute(select(TeamMember).where(TeamMember.team_id == r.team_id))).scalars().all()
    for m in members:
        u = (await db.execute(select(User).where(User.id == m.user_id))).scalar_one()
        await award_reputation(db, u, "room_finished", points=30)
        await award_badge(db, u.id, "pemecah_masalah")
        if m.user_id != user.id:
            await notify(db, m.user_id, "room", f"Ruang selesai: {r.title}", link=f"/idea-rooms/{r.slug}")
    await award_badge(db, user.id, "arsitek_ide")
    return {"status": r.status}
```

> Sertakan `solution_template`, `submission`, dan status di detail ruang (Langkah 39) atau via endpoint terpisah di atas.

## 41.6 Pembaruan Kontrak (Bagian 8)

- Entitas `RoomSubmission { result_summary_md, notebook_id, asset_refs:[{type,slug}], metrics, submitted_by }`; `SolutionTemplate { sections:[{key,title}] }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET/PATCH | `/idea-rooms/{slug}/solution-template` | — / master | template solusi |
| POST | `/idea-rooms/{slug}/upload-data` | anggota | unggah data (mode collect) |
| POST/GET | `/idea-rooms/{slug}/submit`, `/submission` | master/— | kirim/lihat hasil |
| POST | `/idea-rooms/{slug}/finish` | master | `{publish_assets, visibility}` → finished + gamifikasi |

## Selesai bila

- [ ] Template solusi punya default; master dapat menyunting.
- [ ] Ruang collect: anggota mengunggah data → menjadi dataset team-owned & `dataset_repo_slug`.
- [ ] Submit menyimpan notebook+ringkasan+aset+metrik; status `solving→submitted`.
- [ ] Finish (`submitted→finished`) membagikan aset ke proyek (publik/privat) dan memberi reputasi+badge ke semua anggota; master dapat badge "Arsitek Ide".
- [ ] Anggota menerima notifikasi saat ruang selesai.
