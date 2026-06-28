# Langkah 40 — Ruang Ide: Generasi Masalah → Data

> **Tujuan:** AI meramu komponen masalah menjadi pernyataan + spesifikasi data (master meninjau), lalu hasilkan data: **sintesis** (panggil mesin Langkah 38), **sekunder** (tautkan dataset sumber), atau **kumpulkan** (data tak terstruktur + rekomendasi AI). Transisi `closed → generating → solving`. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 39 (ruang), 38 (mesin data + klien AI), 15/37 (repo team-owned).

## 40.1 Model & field tambahan — `app/modules/rooms/models.py`

```python
class RoomProblem(Base):
    __tablename__ = "room_problems"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"rpb_{uuid.uuid4().hex[:12]}")
    room_id: Mapped[str] = mapped_column(ForeignKey("idea_rooms.id"), unique=True, index=True)
    statement_md: Mapped[str] = mapped_column(String, default="")
    suggested_metric: Mapped[str | None] = mapped_column(String, nullable=True)
    data_kind: Mapped[str] = mapped_column(String, default="structured")     # structured|unstructured
    data_spec: Mapped[dict | None] = mapped_column(JSON, nullable=True)       # spec generator (structured)
    unstructured_guidance_md: Mapped[str | None] = mapped_column(String, nullable=True)
    generated_by: Mapped[str] = mapped_column(String, default="ai")          # ai|manual
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Tambah field ke `IdeaRoom`: `generation_error`.

```python
generation_error: Mapped[str | None] = mapped_column(String, nullable=True)
```

Tambah ke `Repo` (Langkah 5) — jejak provenance:

```python
room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "room problem and data"
docker compose exec backend alembic upgrade head
```

## 40.2 Ramu masalah (AI) — `app/modules/rooms/router.py`

```python
import json
from app.core.ai.client import chat_json
from app.modules.synthesis.quota import quota_for
from app.modules.synthesis.models import SynthesisJob
from app.modules.rooms.models import RoomProblem, ProblemComponent

FRAME_SYSTEM = (
  "Anda fasilitator problem-based learning untuk konteks Indonesia. Diberi komponen masalah dari tim "
  "(konteks/batasan/tujuan/kebutuhan data/metrik), ramu menjadi SATU JSON valid: "
  "{statement_md, suggested_metric, data_kind:'structured'|'unstructured', "
  "data_spec:{name,description,columns:[{name,dtype,params}]} (WAJIB bila structured), "
  "unstructured_guidance_md (WAJIB bila unstructured: panduan sumber/format/pelabelan)}. "
  "dtype yang diizinkan: int,float,category,bool,datetime,name,address,city,company,phone,id,text,formula."
)

async def _today_llm_used(db, user_id):
    from datetime import datetime, timezone
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (await db.execute(select(func.count()).select_from(SynthesisJob).where(
        SynthesisJob.user_id == user_id, SynthesisJob.used_llm == True,
        SynthesisJob.created_at >= start))).scalar_one()

@router.post("/idea-rooms/{slug}/frame-problem")
async def frame_problem(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status != "closed": raise ApiError(400, "invalid_state", "Ramu masalah hanya saat ruang closed")
    cfg = quota_for(user)
    if await _today_llm_used(db, user.id) >= cfg["plans_per_day"]:
        raise ApiError(429, "quota_exceeded", "Kuota AI harian habis. Naik tier untuk kuota lebih besar.")
    comps = (await db.execute(select(ProblemComponent).where(ProblemComponent.room_id == r.id))).scalars().all()
    if not comps: raise ApiError(400, "no_components", "Belum ada komponen masalah")
    text = "Komponen masalah:\n" + "\n".join(f"- [{c.kind}] {c.content_md}" for c in comps)
    raw, usage = chat_json(FRAME_SYSTEM, text)
    data = json.loads(raw)
    prob = (await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))).scalar_one_or_none()
    if not prob:
        prob = RoomProblem(room_id=r.id); db.add(prob)
    prob.statement_md = data.get("statement_md", "")
    prob.suggested_metric = data.get("suggested_metric")
    prob.data_kind = data.get("data_kind", "structured")
    prob.data_spec = data.get("data_spec")
    prob.unstructured_guidance_md = data.get("unstructured_guidance_md")
    prob.generated_by = "ai"
    # catat pemakaian AI untuk kuota & biaya
    db.add(SynthesisJob(user_id=user.id, status="done", prompt=f"frame:{slug}", used_llm=True,
                        n_rows=0, tokens_in=usage.prompt_tokens, tokens_out=usage.completion_tokens))
    await db.commit()
    return _ser_problem(prob)

def _ser_problem(p):
    return {"statement_md": p.statement_md, "suggested_metric": p.suggested_metric,
            "data_kind": p.data_kind, "data_spec": p.data_spec,
            "unstructured_guidance_md": p.unstructured_guidance_md, "generated_by": p.generated_by}

@router.get("/idea-rooms/{slug}/problem")
async def get_problem(slug: str, db=Depends(get_db)):
    r = await get_room(db, slug)
    p = (await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))).scalar_one_or_none()
    if not p: raise ApiError(404, "not_found", "Masalah belum diramu")
    return _ser_problem(p)

@router.patch("/idea-rooms/{slug}/problem")   # master menyunting hasil ramuan
async def edit_problem(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    p = (await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))).scalar_one_or_none()
    if not p: raise ApiError(404, "not_found", "Masalah belum diramu")
    for k in ("statement_md", "suggested_metric", "data_kind", "data_spec", "unstructured_guidance_md"):
        if k in body: setattr(p, k, body[k])
    p.generated_by = "manual"
    await db.commit(); return _ser_problem(p)
```

## 40.3 Worker data ruang — `app/modules/rooms/worker.py`

```python
import uuid
from sqlalchemy import select
from app.core.db import async_session
from app.core.storage import upload_asset
from app.modules.synthesis.spec import DatasetSpec
from app.modules.synthesis.engine import generate
from app.modules.rooms.models import IdeaRoom, RoomProblem
from app.modules.teams.models import Team
from app.modules.repos.models import Repo
from app.modules.categories.util import slugify

async def run_room_data_job(room_id: str, n_rows: int):
    async with async_session() as db:
        r = (await db.execute(select(IdeaRoom).where(IdeaRoom.id == room_id))).scalar_one()
        p = (await db.execute(select(RoomProblem).where(RoomProblem.room_id == room_id))).scalar_one()
        team = (await db.execute(select(Team).where(Team.id == r.team_id))).scalar_one()
        try:
            spec = DatasetSpec(**p.data_spec); spec.validate_types()
            df = generate(spec, n_rows)
            url = upload_asset(f"rooms/{r.slug}/data.csv", df.to_csv(index=False).encode(), "text/csv")
            name = slugify(spec.name or f"data-{r.slug}")
            ds_slug = f"{team.slug}/{name}"
            if (await db.execute(select(Repo).where(Repo.slug == ds_slug))).scalar_one_or_none():
                ds_slug = f"{ds_slug}-{uuid.uuid4().hex[:4]}"
            repo = Repo(kind="dataset", owner_id=r.founder_id, team_id=r.team_id, name=name, slug=ds_slug,
                        description=spec.description, visibility="private", synthetic=True,
                        generation_spec=p.data_spec, room_id=r.id,
                        files=[{"path": "data.csv", "url": url,
                                "size_bytes": len(df.to_csv(index=False).encode()), "type": "text/csv"}])
            db.add(repo); await db.commit()
            r.dataset_repo_slug = repo.slug; r.status = "solving"; r.generation_error = None
            await db.commit()
        except Exception as e:
            r.status = "closed"; r.generation_error = str(e)[:500]; await db.commit()
```

## 40.4 Hasilkan data — `app/modules/rooms/router.py`

```python
from fastapi import BackgroundTasks
from app.modules.rooms.worker import run_room_data_job
from app.modules.repos.models import Repo

@router.post("/idea-rooms/{slug}/generate-data")
async def generate_data(slug: str, body: dict, bg: BackgroundTasks,
                        user=Depends(get_current_user), db=Depends(get_db)):
    r = await get_room(db, slug); await require_master(db, r, user)
    if r.status != "closed": raise ApiError(400, "invalid_state", "Hasilkan data hanya saat closed")
    p = (await db.execute(select(RoomProblem).where(RoomProblem.room_id == r.id))).scalar_one_or_none()
    if not p: raise ApiError(400, "no_problem", "Ramu masalah dulu")
    mode = body.get("data_mode")     # synthetic | secondary | collect

    if p.data_kind == "unstructured" or mode == "collect":
        r.data_mode = "collect"; r.status = "solving"          # tim mengumpulkan data + panduan AI
        await db.commit(); return {"status": r.status, "data_mode": "collect"}

    if mode == "secondary":
        ds_slug = body.get("secondary_dataset_slug")
        ds = (await db.execute(select(Repo).where(Repo.slug == ds_slug, Repo.kind == "dataset"))).scalar_one_or_none()
        if not ds: raise ApiError(404, "not_found", "Dataset sumber tidak ditemukan")
        r.data_mode = "secondary"; r.dataset_repo_slug = ds_slug; r.status = "solving"
        await db.commit(); return {"status": r.status, "data_mode": "secondary"}

    # synthetic
    if not p.data_spec: raise ApiError(400, "no_spec", "Tidak ada spesifikasi data untuk sintesis")
    n_rows = min(int(body.get("n_rows", 1000)), quota_for(user)["max_rows"])
    r.data_mode = "synthetic"; r.status = "generating"; r.generation_error = None
    await db.commit()
    bg.add_task(run_room_data_job, r.id, n_rows)
    return {"status": r.status, "data_mode": "synthetic"}
```

> Sertakan `data_mode`, `dataset_repo_slug`, `generation_error` di detail ruang (`GET /idea-rooms/{slug}`, Langkah 39).

## 40.5 Pembaruan Kontrak (Bagian 8)

- `IdeaRoom` **+** `data_mode`, `dataset_repo_slug`, `generation_error`.
- Entitas `RoomProblem { statement_md, suggested_metric, data_kind, data_spec, unstructured_guidance_md, generated_by }`.
- `Repo` (dataset) **+** `room_id?`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST | `/idea-rooms/{slug}/frame-problem` | master | AI ramu komponen → masalah (kuota AI) |
| GET/PATCH | `/idea-rooms/{slug}/problem` | — / master | lihat / sunting masalah |
| POST | `/idea-rooms/{slug}/generate-data` | master | `{data_mode, n_rows?, secondary_dataset_slug?}` → solving/generating |

## Selesai bila

- [ ] Ramu masalah memanggil AI, menghasilkan pernyataan + (data_spec atau panduan unstructured); kuota AI dihormati.
- [ ] Master dapat meninjau & menyunting masalah/spec **sebelum** generasi.
- [ ] Sintesis: data dibuat (mesin Langkah 38), terdaftar sebagai dataset **team-owned** berlabel sintesis, ruang → solving.
- [ ] Sekunder: dataset sumber ditautkan; unstructured: ruang → solving dengan panduan pengumpulan, tanpa generasi.
- [ ] Kegagalan generasi mengembalikan ruang ke closed + pesan error.
