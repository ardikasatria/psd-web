# Langkah 45 — Pabrik Data: Mesin Eksekusi (DuckDB)

> **Tujuan:** Eksekusi pipeline — terjemahkan DAG → SQL DuckDB **aman** (hanya operasi terdaftar), baca dataset dari MinIO, tulis lapisan bronze/silver/gold (Parquet), catat `PipelineRun` + lineage, dengan throttle gamifikasi (`runs_per_day`/`max_rows`) + timeout. **Kerjakan hanya langkah ini.** Prasyarat: Langkah 44 (sumber & spec), 38 (storage MinIO), 25 (gamifikasi). Acuan: Cetak Biru Pabrik Data §3.3.

> **Prinsip keamanan (wajib):** TIDAK ADA SQL mentah dari pengguna. Setiap node diterjemahkan dari params terstruktur ke SQL dengan identifier ter-kutip & literal ter-escape. Nama kolom divalidasi regex. Ekspresi `derive`/`filter` dibatasi whitelist.

## 45.1 Dependensi

```bash
pip install duckdb
```

`duckdb` memakai ekstensi `httpfs` untuk membaca/menulis S3/MinIO.

## 45.2 Model run — `app/modules/factory/models.py` (tambah)

```python
class PipelineRun(Base):
    __tablename__ = "pipeline_runs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: f"run_{uuid.uuid4().hex[:12]}")
    pipeline_id: Mapped[str] = mapped_column(ForeignKey("pipelines.id"), index=True)
    status: Mapped[str] = mapped_column(String, default="queued")   # queued|running|done|error
    rows_out: Mapped[int] = mapped_column(Integer, default=0)
    layers_json: Mapped[dict] = mapped_column(JSON, default=dict)   # {layer: [{node, table, rows, uri}]}
    lineage_json: Mapped[dict] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(String, nullable=True)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
```

(Tambah `from sqlalchemy import Integer` bila belum.) Migrasi:

```bash
docker compose exec backend alembic revision --autogenerate -m "pipeline runs"
docker compose exec backend alembic upgrade head
```

## 45.3 Penerjemah aman — `app/modules/factory/sql.py`

```python
import re
from app.core.errors import ApiError

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_EXPR_OK = re.compile(r"^[A-Za-z0-9_+\-*/().,\s]+$")   # ekspresi derive: kolom, angka, operator dasar
_OPS = {"=": "=", "!=": "<>", ">": ">", "<": "<", ">=": ">=", "<=": "<=",
        "in": "IN", "contains": "LIKE"}
_AGG = {"sum": "SUM", "avg": "AVG", "count": "COUNT", "min": "MIN", "max": "MAX"}
_CAST = {"int": "BIGINT", "double": "DOUBLE", "varchar": "VARCHAR", "date": "DATE", "bool": "BOOLEAN"}

def ident(name: str) -> str:
    if not isinstance(name, str) or not _IDENT.match(name):
        raise ApiError(422, "bad_identifier", f"Nama kolom tidak valid: {name}")
    return f'"{name}"'

def lit(v):
    if isinstance(v, bool): return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)): return str(v)
    if v is None: return "NULL"
    return "'" + str(v).replace("'", "''") + "'"      # escape kutip

def build_filter(params: dict) -> str:
    col = ident(params["column"]); op = params.get("op", "=")
    if op not in _OPS: raise ApiError(422, "bad_op", f"Operator filter tak dikenal: {op}")
    if op == "in":
        vals = params.get("value", [])
        return f"{col} IN ({', '.join(lit(x) for x in vals)})"
    if op == "contains":
        return f"{col} LIKE {lit('%' + str(params['value']) + '%')}"
    return f"{col} {_OPS[op]} {lit(params['value'])}"

def build_derive(params: dict) -> str:
    expr = params.get("expr", "")
    if not _EXPR_OK.match(expr):
        raise ApiError(422, "bad_expr", "Ekspresi derive mengandung karakter terlarang")
    return f"({expr}) AS {ident(params['name'])}"

def select_sql(src_rel: str, cols) -> str:
    c = ", ".join(ident(x) for x in cols) if cols else "*"
    return f"SELECT {c} FROM {src_rel}"

def aggregate_sql(src_rel: str, params: dict) -> str:
    gb = [ident(x) for x in params.get("group_by", [])]
    aggs = []
    for a in params.get("aggs", []):
        fn = a.get("fn")
        if fn not in _AGG: raise ApiError(422, "bad_agg", f"Agregasi tak dikenal: {fn}")
        aggs.append(f"{_AGG[fn]}({ident(a['col'])}) AS {ident(a.get('as', a['col']))}")
    sel = ", ".join(gb + aggs) or "*"
    g = f" GROUP BY {', '.join(gb)}" if gb else ""
    return f"SELECT {sel} FROM {src_rel}{g}"

def cast_sql(src_rel: str, params: dict) -> str:
    casts = []
    for c in params.get("casts", []):
        to = c.get("to")
        if to not in _CAST: raise ApiError(422, "bad_cast", f"Tipe cast tak dikenal: {to}")
        casts.append(f"CAST({ident(c['col'])} AS {_CAST[to]}) AS {ident(c['col'])}")
    return f"SELECT * EXCLUDE ({', '.join(ident(c['col']) for c in params['casts'])}), {', '.join(casts)} FROM {src_rel}"

def node_sql(node: dict, inputs: list[str]) -> str:
    """inputs = nama relasi (view) hulu. Mengembalikan SQL SELECT untuk node ini."""
    t = node.get("type"); op = node.get("op"); p = node.get("params") or {}
    if t == "source":
        return inputs[0]                      # source di-resolve di engine (read_csv/parquet)
    rel = inputs[0]
    if t == "sink":
        return f"SELECT * FROM {rel}"
    if op == "select":    return select_sql(rel, p.get("columns"))
    if op == "filter":    return f"SELECT * FROM {rel} WHERE {build_filter(p)}"
    if op == "aggregate": return aggregate_sql(rel, p)
    if op == "cast":      return cast_sql(rel, p)
    if op == "derive":    return f"SELECT *, {build_derive(p)} FROM {rel}"
    if op == "dedupe":    return f"SELECT DISTINCT * FROM {rel}"
    if op == "join":
        how = {"inner": "INNER", "left": "LEFT"}.get(p.get("how", "inner"), "INNER")
        lo = ident(p["left_on"]); ro = ident(p["right_on"])
        return f"SELECT * FROM {inputs[0]} a {how} JOIN {inputs[1]} b ON a.{lo} = b.{ro}"
    raise ApiError(422, "bad_node", f"Node tak dapat diterjemahkan: {node.get('id')}")
```

## 45.4 Mesin — `app/modules/factory/engine.py`

```python
import os, time, threading
from collections import deque
import duckdb
from sqlalchemy import select
from app.modules.factory.models import DataSource
from app.modules.factory.sql import node_sql
from app.modules.repos.models import Repo

ASSET_BUCKET = os.getenv("MINIO_ASSET_BUCKET", "psd-assets")

def _connect():
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute(f"SET s3_endpoint='{os.getenv('MINIO_ENDPOINT','minio:9000')}';")
    con.execute(f"SET s3_access_key_id='{os.getenv('MINIO_ACCESS_KEY','')}';")
    con.execute(f"SET s3_secret_access_key='{os.getenv('MINIO_SECRET_KEY','')}';")
    con.execute("SET s3_use_ssl=false; SET s3_url_style='path';")
    return con

async def _resolve_source(db, source_id):
    s = (await db.execute(select(DataSource).where(DataSource.id == source_id))).scalar_one()
    slug = s.uri.replace("psd://dataset/", "")
    repo = (await db.execute(select(Repo).where(Repo.slug == slug))).scalar_one()
    f = (repo.files or [{}])[0]
    key = f.get("path_key") or f"{slug}/{f.get('path','data.csv')}"   # sesuaikan dgn skema penyimpanan Langkah 15
    uri = f"s3://{ASSET_BUCKET}/{key}"
    fmt = "parquet" if uri.endswith(".parquet") else "csv"
    return uri, fmt

def _topo(nodes, edges):
    ids = [n["id"] for n in nodes]
    adj = {i: [] for i in ids}; indeg = {i: 0 for i in ids}; preds = {i: [] for i in ids}
    for e in edges:
        adj[e["source"]].append(e["target"]); indeg[e["target"]] += 1
        preds[e["target"]].append(e["source"])
    dq = deque([i for i in ids if indeg[i] == 0]); order = []
    while dq:
        x = dq.popleft(); order.append(x)
        for y in adj[x]:
            indeg[y] -= 1
            if indeg[y] == 0: dq.append(y)
    return order, preds

def run_dag(con, nodes_by_id, order, preds, source_map, max_rows, run_id):
    """Bangun view per node; materialisasi node berlapis ke Parquet. Mengembalikan (layers, lineage, rows_out)."""
    layers, lineage, rows_out = {}, {}, 0
    for nid in order:
        n = nodes_by_id[nid]
        if n["type"] == "source":
            uri, fmt = source_map[nid]
            reader = f"read_parquet('{uri}')" if fmt == "parquet" else f"read_csv_auto('{uri}')"
            con.execute(f'CREATE OR REPLACE TEMP VIEW "{nid}" AS SELECT * FROM {reader} LIMIT {max_rows};')
        else:
            inputs = [f'"{p}"' for p in preds[nid]]
            sql = node_sql(n, inputs)
            con.execute(f'CREATE OR REPLACE TEMP VIEW "{nid}" AS {sql};')
        lineage[nid] = {"op": n.get("op"), "type": n["type"], "layer": n.get("layer"), "inputs": preds[nid]}
        layer = n.get("layer")
        if layer or n["type"] == "sink":
            lyr = layer or "gold"
            cnt = con.execute(f'SELECT count(*) FROM "{nid}";').fetchone()[0]
            out = f"s3://{ASSET_BUCKET}/pipelines/{run_id}/{lyr}/{nid}.parquet"
            con.execute(f"COPY (SELECT * FROM \"{nid}\") TO '{out}' (FORMAT PARQUET);")
            layers.setdefault(lyr, []).append({"node": nid, "rows": cnt, "uri": out})
            if lyr == "gold": rows_out += cnt
    return layers, lineage, rows_out
```

> **Catatan resolusi kunci objek (`path_key`):** sesuaikan `_resolve_source` dengan cara Langkah 15 menyimpan kunci file di MinIO. Bila `files[]` hanya menyimpan URL publik, tambahkan `path_key` saat unggah agar DuckDB bisa membaca via `s3://`.

## 45.5 Worker — `app/modules/factory/worker.py`

```python
import time, threading
from sqlalchemy import select
from app.core.db import async_session
from app.modules.factory.models import Pipeline, PipelineRun, DataSource
from app.modules.factory.engine import _connect, _resolve_source, _topo, run_dag

TIMEOUT_S = 90

async def run_pipeline_job(run_id: str, max_rows: int):
    async with async_session() as db:
        run = (await db.execute(select(PipelineRun).where(PipelineRun.id == run_id))).scalar_one()
        pl = (await db.execute(select(Pipeline).where(Pipeline.id == run.pipeline_id))).scalar_one()
        run.status = "running"; await db.commit()
        spec = pl.spec_json or {"nodes": [], "edges": []}
        nodes_by_id = {n["id"]: n for n in spec["nodes"]}
        order, preds = _topo(spec["nodes"], spec["edges"])
        source_map = {}
        for n in spec["nodes"]:
            if n["type"] == "source":
                source_map[n["id"]] = await _resolve_source(db, n["params"]["source_id"])
        con = _connect()
        timer = threading.Timer(TIMEOUT_S, con.interrupt)   # watchdog timeout
        t0 = time.time()
        try:
            timer.start()
            layers, lineage, rows_out = run_dag(con, nodes_by_id, order, preds, source_map, max_rows, run_id)
            run.status = "done"; run.layers_json = layers; run.lineage_json = lineage
            run.rows_out = rows_out
        except Exception as e:
            run.status = "error"; run.error = str(e)[:500]
        finally:
            timer.cancel(); con.close()
            run.duration_ms = int((time.time() - t0) * 1000)
            await db.commit()
```

## 45.6 Endpoint — `app/modules/factory/router.py` (tambah)

```python
from datetime import datetime, timezone
from fastapi import BackgroundTasks
from app.modules.factory.models import PipelineRun
from app.modules.factory.quota import quota_for
from app.modules.factory.worker import run_pipeline_job

async def _runs_today(db, owner_id):
    start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    return (await db.execute(select(func.count()).select_from(PipelineRun)
            .join(Pipeline, Pipeline.id == PipelineRun.pipeline_id)
            .where(Pipeline.owner_id == owner_id, PipelineRun.created_at >= start))).scalar_one()

@router.get("/me/factory/quota")
async def factory_quota(user=Depends(get_current_user), db=Depends(get_db)):
    q = quota_for(user)
    return {**q, "runs_used_today": await _runs_today(db, user.id)}

@router.post("/pipelines/{slug}/run", status_code=202)
async def run_pipeline(slug: str, bg: BackgroundTasks, user=Depends(get_current_user), db=Depends(get_db)):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl: raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    await _can_edit_pipeline(db, pl, user)
    if pl.status != "valid": raise ApiError(400, "invalid", "Pipeline belum valid")
    q = quota_for(user)
    if await _runs_today(db, user.id) >= q["runs_per_day"]:
        raise ApiError(429, "quota_exceeded", "Kuota run harian habis. Naik tier untuk lebih banyak.")
    run = PipelineRun(pipeline_id=pl.id, status="queued"); db.add(run); await db.commit()
    bg.add_task(run_pipeline_job, run.id, q["max_rows"])
    return {"run_id": run.id, "status": run.status}

@router.get("/pipelines/{slug}/runs")
async def list_runs(slug: str, db=Depends(get_db)):
    pl = (await db.execute(select(Pipeline).where(Pipeline.slug == slug))).scalar_one_or_none()
    if not pl: raise ApiError(404, "not_found", "Pipeline tidak ditemukan")
    rows = (await db.execute(select(PipelineRun).where(PipelineRun.pipeline_id == pl.id)
            .order_by(PipelineRun.created_at.desc()).limit(20))).scalars().all()
    return {"items": [{"id": r.id, "status": r.status, "rows_out": r.rows_out,
                       "duration_ms": r.duration_ms, "created_at": r.created_at} for r in rows]}

@router.get("/pipelines/{slug}/runs/{run_id}")
async def run_detail(slug: str, run_id: str, db=Depends(get_db)):
    r = (await db.execute(select(PipelineRun).where(PipelineRun.id == run_id))).scalar_one_or_none()
    if not r: raise ApiError(404, "not_found", "Run tidak ditemukan")
    return {"id": r.id, "status": r.status, "rows_out": r.rows_out, "layers": r.layers_json,
            "lineage": r.lineage_json, "error": r.error, "duration_ms": r.duration_ms}
```

> **Produksi:** ganti `BackgroundTasks` dengan **Celery** agar eksekusi tak membebani proses API & bisa di-scale. Antarmuka worker tetap sama.

## 45.7 Pembaruan Kontrak (Bagian 8)

- Entitas `PipelineRun { id, status(queued|running|done|error), rows_out, layers{layer:[{node,rows,uri}]}, lineage, error, duration_ms }`.
- `FactoryQuota { runs_per_day, max_rows, max_nodes, runs_used_today }`.

| Metode | Path | Auth | Catatan |
|---|---|---|---|
| GET | `/me/factory/quota` | ✓ | kuota + pemakaian hari ini |
| POST | `/pipelines/{slug}/run` | editor | jalankan (cek valid + kuota) |
| GET | `/pipelines/{slug}/runs` | — | daftar run |
| GET | `/pipelines/{slug}/runs/{id}` | — | detail run + lineage |

## Selesai bila

- [ ] Run menerjemahkan DAG → SQL DuckDB (topological), membaca dataset dari MinIO, menulis lapisan Parquet.
- [ ] Hanya operasi terdaftar; identifier/literal aman; ekspresi derive/filter divalidasi (tanpa SQL mentah).
- [ ] `max_rows` membatasi baca sumber; timeout `interrupt` mematikan run lama; `runs_per_day` ditegakkan (429).
- [ ] `PipelineRun` mencatat status, lapisan, lineage, rows_out, durasi; error tersimpan.
- [ ] Lineage menunjukkan input tiap node + lapisan keluarannya.
