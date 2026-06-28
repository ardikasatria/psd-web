# Langkah 44 — Pabrik Data: Sumber & Spec Pipeline

> **Tujuan:** Fondasi Pabrik Data — daftarkan dataset jadi **sumber** (URI), simpan & **validasi** spec pipeline (DAG): asiklik, node/op dikenal, batas node per tier gamifikasi. **Kerjakan hanya langkah ini.** Belum ada eksekusi (Langkah 45). Prasyarat: Repo/dataset (5/15), Tim (37), Gamifikasi (25), Kategori (33). Acuan: Cetak Biru Pabrik Data.

## 44.1 Model — `app/modules/factory/models.py`

```python
import uuid
from datetime import datetime
from sqlalchemy import String, JSON, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column
from app.core.db import Base

class DataSource(Base):
    __tablename__ = "data_sources"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"src_{uuid.uuid4().hex[:12]}")
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    name: Mapped[str] = mapped_column(String)
    uri: Mapped[str] = mapped_column(String)                # psd://dataset/{slug} atau eksternal
    kind: Mapped[str] = mapped_column(String, default="dataset")   # dataset|external
    schema_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)   # diisi penuh di Langkah 45
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

class Pipeline(Base):
    __tablename__ = "pipelines"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"pl_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String)
    spec_json: Mapped[dict] = mapped_column(JSON, default=lambda: {"nodes": [], "edges": []})
    status: Mapped[str] = mapped_column(String, default="draft")    # draft|valid|error
    validation_error: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "data sources and pipelines"
docker compose exec backend alembic upgrade head
```

## 44.2 Kuota pipeline — `app/modules/factory/quota.py`

```python
from app.modules.gamification.service import tier_for     # Langkah 25

PIPELINE_TIER = {
    "Pemula":      {"runs_per_day": 5,   "max_rows": 50_000,    "max_nodes": 8},
    "Kontributor": {"runs_per_day": 15,  "max_rows": 200_000,   "max_nodes": 15},
    "Ahli":        {"runs_per_day": 40,  "max_rows": 1_000_000, "max_nodes": 25},
    "Master":      {"runs_per_day": 120, "max_rows": 5_000_000, "max_nodes": 40},
    "Grandmaster": {"runs_per_day": 400, "max_rows": 20_000_000,"max_nodes": 80},
}

def quota_for(user) -> dict:
    tier = tier_for(getattr(user, "reputation", 0))      # kembalikan nama tier
    return PIPELINE_TIER.get(tier, PIPELINE_TIER["Pemula"])
```

> Sesuaikan pemanggilan `tier_for` dengan tanda tangan nyata di Langkah 25 (nama tier dari reputasi).

## 44.3 Validasi spec (murni, tanpa DB) — `app/modules/factory/validate.py`

```python
from collections import deque

NODE_TYPES = {"source", "transform", "sink"}
TRANSFORM_OPS = {"select", "filter", "join", "aggregate", "cast", "derive", "dedupe"}
LAYERS = {None, "bronze", "silver", "gold"}

def validate_spec(spec: dict, max_nodes: int) -> list[str]:
    errors: list[str] = []
    nodes = spec.get("nodes", []) or []
    edges = spec.get("edges", []) or []
    ids = [n.get("id") for n in nodes]

    if len(nodes) > max_nodes:
        errors.append(f"Jumlah node ({len(nodes)}) melebihi batas tier ({max_nodes})")
    if len(ids) != len(set(ids)):
        errors.append("Terdapat ID node duplikat")
    idset = set(ids)

    for n in nodes:
        nid = n.get("id"); t = n.get("type")
        if t not in NODE_TYPES:
            errors.append(f"Tipe node tidak dikenal pada '{nid}'")
        if t == "transform" and n.get("op") not in TRANSFORM_OPS:
            errors.append(f"Operasi transform tidak dikenal pada '{nid}'")
        if n.get("layer") not in LAYERS:
            errors.append(f"Lapisan tidak valid pada '{nid}'")
        if t == "source" and not (n.get("params") or {}).get("source_id"):
            errors.append(f"Node source tanpa source_id pada '{nid}'")

    indeg = {i: 0 for i in ids}; adj = {i: [] for i in ids}
    for e in edges:
        s, t = e.get("source"), e.get("target")
        if s not in idset or t not in idset:
            errors.append("Edge menunjuk node yang tidak ada"); continue
        adj[s].append(t); indeg[t] += 1

    for n in nodes:
        nid, t = n.get("id"), n.get("type")
        if t == "source" and indeg.get(nid, 0) > 0:
            errors.append(f"Node source tidak boleh memiliki input: '{nid}'")
        if t != "source" and len(nodes) > 1 and indeg.get(nid, 0) == 0:
            errors.append(f"Node tanpa input: '{nid}'")
        if n.get("op") == "join" and indeg.get(nid, 0) < 2:
            errors.append(f"Operasi join membutuhkan 2 input: '{nid}'")

    # asiklik (Kahn)
    ind = dict(indeg); dq = deque([i for i in ids if ind[i] == 0]); seen = 0
    while dq:
        x = dq.popleft(); seen += 1
        for y in adj[x]:
            ind[y] -= 1
            if ind[y] == 0: dq.append(y)
    if seen != len(ids):
        errors.append("Graf memiliki siklus — pipeline harus DAG (asiklik)")
    return errors
```

## 44.4 Router — `app/modules/factory/router.py`

```python
import uuid
from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from app.core.db import get_db
from app.core.deps import get_current_user
from app.core.errors import ApiError
from app.core.pagination import PageParams, page_params, paginated
from app.modules.categories.util import slugify
from app.modules.factory.models import DataSource, Pipeline
from app.modules.factory.quota import quota_for
from app.modules.factory.validate import validate_spec
from app.modules.repos.models import Repo
from app.modules.teams.deps import membership

router = APIRouter(tags=["factory"])

async def _can_edit_pipeline(db, pl, user):
    if pl.owner_id == user.id: return True
    if pl.team_id and await membership(db, pl.team_id, user.id): return True
    raise ApiError(403, "forbidden", "Tidak berhak menyunting pipeline")

# ---- sumber data ----
@router.post("/data-sources", status_code=201)
async def register_source(body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    ds_slug = body.get("dataset_slug")
    repo = (await db.execute(select(Repo).where(Repo.slug == ds_slug, Repo.kind == "dataset"))).scalar_one_or_none()
    if not repo: raise ApiError(404, "not_found", "Dataset tidak ditemukan")
    src = DataSource(owner_id=user.id, team_id=repo.team_id, name=body.get("name") or repo.name,
                     uri=f"psd://dataset/{repo.slug}", kind="dataset", schema_json=None)
    db.add(src); await db.commit()
    return {"id": src.id, "uri": src.uri}

@router.get("/data-sources")
async def list_sources(user=Depends(get_current_user), db=Depends(get_db)):
    rows = (await db.execute(select(DataSource).where(DataSource.owner_id == user.id)
            .order_by(DataSource.created_at.desc()))).scalars().all()
    return {"items": [{"id": s.id, "name": s.name, "uri": s.uri, "kind": s.kind} for s in rows]}

@router.delete("/data-sources/{sid}", status_code=204)
async def delete_source(sid: str, user=Depends(get_current_user), db=Depends(get_db)):
    s = (await db.execute(select(DataSource).where(DataSource.id == sid))).scalar_one_or_none()
    if s and s.owner_id == user.id:
        await db.delete(s); await db.commit()

# ---- pipeline ----
async def _validate_and_set(db, pl, user):
    q = quota_for(user)
    errors = validate_spec(pl.spec_json or {"nodes": [], "edges": []}, q["max_nodes"])
    # cek source_id mengacu DataSource yang ada
    for n in (pl.spec_json or {}).get("nodes", []):
        if n.get("type") == "source":
            sid = (n.get("params") or {}).get("source_id")
            if sid and not (await db.execute(select(DataSource).where(DataSource.id == sid))).scalar_one_or_none():
                errors.append(f"Sumber tidak ditemukan untuk node '{n.get('id')}'")
    pl.status = "error" if errors else ("valid" if (pl.spec_json or {}).get("nodes") else "draft")
    pl.validation_error = "; ".join(errors) if errors else None
    return errors

@router.post("/pipelines", status_code=201)
async def create_pipeline(body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    base = slugify(body["title"]); pslug = base
    if (await db.execute(select(Pipeline).where(Pipeline.slug == pslug))).scalar_one_or_none():
        pslug = f"{base}-{uuid.uuid4().hex[:4]}"
    team_id = body.get("team_id")
    if team_id and not await membership(db, team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    pl = Pipeline(slug=pslug, owner_id=user.id, team_id=team_id, room_id=body.get("room_id"),
                  title=body["title"], spec_json=body.get("spec") or {"nodes": [], "edges": []})
    await _validate_and_set(db, pl, user)
    db.add(pl); await db.commit()
    return {"slug": pl.slug, "status": pl.status}

@router.get("/pipelines")
async def list_pipelines(p: PageParams = Depends(page_params), user=Depends(get_current_user), db=Depends(get_db)):
    stmt = select(Pipeline).where(Pipeline.owner_id == user.id).order_by(Pipeline.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([{"slug": x.slug, "title": x.title, "status": x.status} for x in rows], total, p)

@router.get("/pipelines/{slug}")
async def get_pipeline(slug: str, db=Depends(get_db)):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl: raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    return {"slug": pl.slug, "title": pl.title, "status": pl.status, "spec": pl.spec_json,
            "validation_error": pl.validation_error, "team_id": pl.team_id, "room_id": pl.room_id}

@router.patch("/pipelines/{slug}")
async def update_pipeline(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl: raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    await _can_edit_pipeline(db, pl, user)
    if "title" in body: pl.title = body["title"]
    if "spec" in body: pl.spec_json = body["spec"]
    errors = await _validate_and_set(db, pl, user)
    await db.commit()
    return {"slug": pl.slug, "status": pl.status, "errors": errors}

@router.post("/pipelines/{slug}/validate")
async def validate_pipeline(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl: raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    errors = await _validate_and_set(db, pl, user); await db.commit()
    return {"status": pl.status, "errors": errors}

@router.delete("/pipelines/{slug}", status_code=204)
async def delete_pipeline(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if pl:
        await _can_edit_pipeline(db, pl, user)
        await db.delete(pl); await db.commit()
```

Wire router di `main.py`.

## 44.5 Pembaruan Kontrak (Bagian 8)

- Entitas `DataSource { id, name, uri, kind }`; `Pipeline { slug, title, status(draft|valid|error), spec{nodes,edges}, validation_error, team_id?, room_id? }`.
- Node spec: `{ id, type(source|transform|sink), op?(select|filter|join|aggregate|cast|derive|dedupe), layer?(bronze|silver|gold), params }`; edge `{ source, target }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST/GET | `/data-sources` | ✓ | daftarkan dataset (URI) / daftar |
| DELETE | `/data-sources/{id}` | pemilik | hapus sumber |
| POST/GET | `/pipelines` | ✓ | buat / daftar |
| GET/PATCH/DELETE | `/pipelines/{slug}` | ✓/editor | detail / sunting spec / hapus |
| POST | `/pipelines/{slug}/validate` | ✓ | validasi DAG |

## Selesai bila

- [ ] Dataset dapat didaftarkan sebagai sumber dengan URI `psd://dataset/{slug}`.
- [ ] Pipeline menyimpan spec DAG; validasi menolak siklus, node/op tak dikenal, source tanpa input, join <2 input, dan node melebihi batas tier.
- [ ] Status pipeline `draft|valid|error` + pesan error tersimpan.
- [ ] Source_id pada node diverifikasi mengacu `DataSource` yang ada.
- [ ] Hak sunting menghormati pemilik & anggota tim.
