# Langkah 46 — Pabrik Data: Ruang Analitik (Dashboard Native)

> **Tujuan:** Dashboard native dari tabel **gold** hasil run — model `Dashboard`+`Widget`, query gold Parquet via DuckDB (aman), data untuk chart (KPI/tabel/line/bar/pie/scatter), publish (team-owned, room-linked, publik/privat). **Kerjakan hanya langkah ini.** Prasyarat: Langkah 45 (run + lapisan gold), 44, 37, 25. Acuan: Cetak Biru §3.4 & §4 (native sekarang, Superset Fase 1).

## 46.1 Model — `app/modules/factory/models.py` (tambah)

```python
from sqlalchemy import Boolean

class Dashboard(Base):
    __tablename__ = "dashboards"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"dsh_{uuid.uuid4().hex[:12]}")
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    team_id: Mapped[str | None] = mapped_column(ForeignKey("teams.id"), nullable=True, index=True)
    room_id: Mapped[str | None] = mapped_column(ForeignKey("idea_rooms.id"), nullable=True, index=True)
    pipeline_id: Mapped[str | None] = mapped_column(ForeignKey("pipelines.id"), nullable=True)
    title: Mapped[str] = mapped_column(String)
    description_md: Mapped[str] = mapped_column(String, default="")
    layout_json: Mapped[list] = mapped_column(JSON, default=list)   # [{i:widget_id, x,y,w,h}]
    visibility: Mapped[str] = mapped_column(String, default="private")   # private|public
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

class Widget(Base):
    __tablename__ = "widgets"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"wdg_{uuid.uuid4().hex[:12]}")
    dashboard_id: Mapped[str] = mapped_column(ForeignKey("dashboards.id"), index=True)
    kind: Mapped[str] = mapped_column(String)        # kpi|table|line|bar|pie|scatter
    title: Mapped[str] = mapped_column(String, default="")
    query_json: Mapped[dict] = mapped_column(JSON, default=dict)   # {node, x?, y?, label?, value?, agg?, series?, columns?, limit?}
    options_json: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "dashboards and widgets"
docker compose exec backend alembic upgrade head
```

## 46.2 Query data widget (aman) — `app/modules/factory/analytics.py`

```python
from app.modules.factory.engine import _connect
from app.modules.factory.sql import ident
from app.core.errors import ApiError

_AGG = {"sum": "SUM", "avg": "AVG", "count": "COUNT", "min": "MIN", "max": "MAX"}

def widget_data(uri: str, kind: str, q: dict) -> dict:
    con = _connect()
    try:
        rel = f"read_parquet('{uri}')"
        limit = min(int(q.get("limit", 1000)), 5000)
        if kind == "kpi":
            fn = _AGG.get(q.get("agg", "sum"), "SUM")
            v = con.execute(f"SELECT {fn}({ident(q['y'])}) FROM {rel};").fetchone()[0]
            return {"value": v}
        if kind == "table":
            cols = q.get("columns")
            sel = ", ".join(ident(c) for c in cols) if cols else "*"
            return {"rows": con.execute(f"SELECT {sel} FROM {rel} LIMIT {limit};").df().to_dict("records")}
        if kind in ("line", "bar"):
            x = ident(q["x"])
            if q.get("agg"):
                sql = f"SELECT {x} AS x, {_AGG.get(q['agg'],'SUM')}({ident(q['y'])}) AS y FROM {rel} GROUP BY {x} ORDER BY {x} LIMIT {limit};"
            else:
                sql = f"SELECT {x} AS x, {ident(q['y'])} AS y FROM {rel} ORDER BY {x} LIMIT {limit};"
            return {"points": con.execute(sql).df().to_dict("records")}
        if kind == "pie":
            sql = f"SELECT {ident(q['label'])} AS label, {_AGG.get(q.get('agg','sum'),'SUM')}({ident(q['value'])}) AS value FROM {rel} GROUP BY label ORDER BY value DESC LIMIT {limit};"
            return {"slices": con.execute(sql).df().to_dict("records")}
        if kind == "scatter":
            sql = f"SELECT {ident(q['x'])} AS x, {ident(q['y'])} AS y FROM {rel} LIMIT {limit};"
            return {"points": con.execute(sql).df().to_dict("records")}
        raise ApiError(422, "bad_kind", "Jenis widget tidak dikenal")
    finally:
        con.close()
```

> Keamanan sama dengan Langkah 45: hanya `ident()` & agregasi whitelist; tak ada SQL mentah.

## 46.3 Resolusi gold terbaru & router — `app/modules/factory/router.py` (tambah)

```python
from app.modules.factory.models import Dashboard, Widget, Pipeline, PipelineRun
from app.modules.factory.analytics import widget_data

async def _can_edit_dashboard(db, d, user):
    if d.owner_id == user.id: return True
    if d.team_id and await membership(db, d.team_id, user.id): return True
    raise ApiError(403, "forbidden", "Tidak berhak menyunting dashboard")

async def _latest_gold_map(db, dashboard):
    if not dashboard.pipeline_id: return {}
    run = (await db.execute(select(PipelineRun).where(
        PipelineRun.pipeline_id == dashboard.pipeline_id, PipelineRun.status == "done")
        .order_by(PipelineRun.created_at.desc()).limit(1))).scalar_one_or_none()
    if not run: return {}
    return {g["node"]: g["uri"] for g in (run.layers_json or {}).get("gold", [])}

# ---- CRUD dashboard ----
@router.post("/dashboards", status_code=201)
async def create_dashboard(body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    base = slugify(body["title"]); dslug = base
    if (await db.execute(select(Dashboard).where(Dashboard.slug == dslug))).scalar_one_or_none():
        dslug = f"{base}-{uuid.uuid4().hex[:4]}"
    team_id = body.get("team_id")
    if team_id and not await membership(db, team_id, user.id):
        raise ApiError(403, "forbidden", "Bukan anggota tim")
    d = Dashboard(slug=dslug, owner_id=user.id, team_id=team_id, room_id=body.get("room_id"),
                  pipeline_id=body.get("pipeline_id"), title=body["title"],
                  description_md=body.get("description_md", ""))
    db.add(d); await db.commit(); return {"slug": d.slug}

@router.get("/dashboards")
async def list_dashboards(p: PageParams = Depends(page_params), user=Depends(get_current_user), db=Depends(get_db)):
    stmt = select(Dashboard).where(Dashboard.owner_id == user.id).order_by(Dashboard.updated_at.desc())
    total = (await db.execute(select(func.count()).select_from(stmt.subquery()))).scalar_one()
    rows = (await db.execute(stmt.offset(p.offset).limit(p.page_size))).scalars().all()
    return paginated([{"slug": x.slug, "title": x.title, "visibility": x.visibility} for x in rows], total, p)

@router.get("/dashboards/{slug}")
async def get_dashboard(slug: str, viewer=Depends(get_current_user_optional), db=Depends(get_db)):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if not d: raise ApiError(404, "not_found", "Dashboard tidak ditemukan")
    if d.visibility != "public":
        ok = viewer and (d.owner_id == viewer.id or (d.team_id and await membership(db, d.team_id, viewer.id)))
        if not ok: raise ApiError(403, "private", "Dashboard privat")
    widgets = (await db.execute(select(Widget).where(Widget.dashboard_id == d.id))).scalars().all()
    return {"slug": d.slug, "title": d.title, "description_md": d.description_md,
            "visibility": d.visibility, "layout": d.layout_json, "pipeline_id": d.pipeline_id,
            "widgets": [{"id": w.id, "kind": w.kind, "title": w.title,
                         "query": w.query_json, "options": w.options_json} for w in widgets]}

@router.patch("/dashboards/{slug}")
async def update_dashboard(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if not d: raise ApiError(404, "not_found", "Dashboard tidak ditemukan")
    await _can_edit_dashboard(db, d, user)
    for k in ("title", "description_md", "layout_json", "visibility", "pipeline_id"):
        bk = "layout" if k == "layout_json" else k
        if bk in body: setattr(d, k, body[bk])
    await db.commit(); return {"slug": d.slug}

@router.delete("/dashboards/{slug}", status_code=204)
async def delete_dashboard(slug: str, user=Depends(get_current_user), db=Depends(get_db)):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if d:
        await _can_edit_dashboard(db, d, user)
        await db.delete(d); await db.commit()

# ---- widget ----
@router.post("/dashboards/{slug}/widgets", status_code=201)
async def add_widget(slug: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if not d: raise ApiError(404, "not_found", "Dashboard tidak ditemukan")
    await _can_edit_dashboard(db, d, user)
    if body.get("kind") not in ("kpi", "table", "line", "bar", "pie", "scatter"):
        raise ApiError(422, "bad_kind", "Jenis widget tidak valid")
    w = Widget(dashboard_id=d.id, kind=body["kind"], title=body.get("title", ""),
               query_json=body.get("query", {}), options_json=body.get("options", {}))
    db.add(w); await db.commit(); return {"id": w.id}

@router.patch("/dashboards/{slug}/widgets/{wid}")
async def update_widget(slug: str, wid: str, body: dict, user=Depends(get_current_user), db=Depends(get_db)):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if not d: raise ApiError(404, "not_found", "Dashboard tidak ditemukan")
    await _can_edit_dashboard(db, d, user)
    w = (await db.execute(select(Widget).where(Widget.id == wid, Widget.dashboard_id == d.id))).scalar_one_or_none()
    if not w: raise ApiError(404, "not_found", "Widget tidak ditemukan")
    for k in ("kind", "title", "query_json", "options_json"):
        bk = {"query_json": "query", "options_json": "options"}.get(k, k)
        if bk in body: setattr(w, k, body[bk])
    await db.commit(); return {"id": w.id}

@router.delete("/dashboards/{slug}/widgets/{wid}", status_code=204)
async def delete_widget(slug: str, wid: str, user=Depends(get_current_user), db=Depends(get_db)):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if d:
        await _can_edit_dashboard(db, d, user)
        w = (await db.execute(select(Widget).where(Widget.id == wid, Widget.dashboard_id == d.id))).scalar_one_or_none()
        if w: await db.delete(w); await db.commit()

# ---- data widget ----
@router.get("/dashboards/{slug}/widgets/{wid}/data")
async def widget_data_endpoint(slug: str, wid: str, viewer=Depends(get_current_user_optional), db=Depends(get_db)):
    d = (await db.execute(select(Dashboard).where(Dashboard.slug == slug))).scalar_one_or_none()
    if not d: raise ApiError(404, "not_found", "Dashboard tidak ditemukan")
    if d.visibility != "public":
        ok = viewer and (d.owner_id == viewer.id or (d.team_id and await membership(db, d.team_id, viewer.id)))
        if not ok: raise ApiError(403, "private", "Dashboard privat")
    w = (await db.execute(select(Widget).where(Widget.id == wid, Widget.dashboard_id == d.id))).scalar_one_or_none()
    if not w: raise ApiError(404, "not_found", "Widget tidak ditemukan")
    gold = await _latest_gold_map(db, d)
    node = (w.query_json or {}).get("node")
    uri = gold.get(node)
    if not uri: return {"empty": True, "reason": "Belum ada run gold untuk node ini"}
    return widget_data(uri, w.kind, w.query_json or {})
```

> **Catatan:** `widget_data` membaca Parquet via DuckDB (sinkron). Untuk dashboard ramai, tambahkan cache hasil per (run_id, widget) di Redis (opsional) agar tak query berulang. Fase 1: jalur Superset embed sebagai pengganti untuk BI lanjutan.

## 46.4 Pembaruan Kontrak (Bagian 8)

- Entitas `Dashboard { slug, title, description_md, visibility(private|public), layout, pipeline_id?, widgets[] }`; `Widget { id, kind(kpi|table|line|bar|pie|scatter), title, query, options }`.
- Data widget: `kpi{value}` · `table{rows}` · `line/bar/scatter{points}` · `pie{slices}` · `{empty,reason}`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| POST/GET | `/dashboards` | ✓ | buat / daftar |
| GET/PATCH/DELETE | `/dashboards/{slug}` | opsional/editor | detail (privat→anggota) / sunting / hapus |
| POST/PATCH/DELETE | `/dashboards/{slug}/widgets[/{wid}]` | editor | kelola widget |
| GET | `/dashboards/{slug}/widgets/{wid}/data` | opsional | data terhitung dari gold terbaru |

## Selesai bila

- [ ] Dashboard CRUD (team-owned, room-linked, publik/privat) berfungsi.
- [ ] Widget enam jenis dapat ditambah & disunting; query merujuk node gold.
- [ ] Data widget terhitung dari run gold **terbaru** via DuckDB, aman (ident/agg whitelist).
- [ ] Dashboard privat hanya untuk pemilik/anggota; publik terbuka.
- [ ] Kembalikan `{empty}` rapi bila belum ada run gold.
