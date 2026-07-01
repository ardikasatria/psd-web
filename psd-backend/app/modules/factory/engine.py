import time
from collections import deque

import duckdb
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.factory.models import DataSource
from app.modules.factory.sql import node_sql
from app.modules.repos.models import Repo


def _connect():
    con = duckdb.connect()
    con.execute("INSTALL httpfs; LOAD httpfs;")
    con.execute(f"SET s3_endpoint='{settings.MINIO_ENDPOINT}';")
    con.execute(f"SET s3_access_key_id='{settings.MINIO_KEY}';")
    con.execute(f"SET s3_secret_access_key='{settings.MINIO_SECRET}';")
    con.execute("SET s3_use_ssl=false; SET s3_url_style='path';")
    return con


async def _resolve_source(db: AsyncSession, source_id: str) -> tuple[str, str, bool]:
    """Returns (read_expression, format, is_synthetic)."""
    s = (await db.execute(select(DataSource).where(DataSource.id == source_id))).scalar_one()
    ds_slug = s.uri.replace("psd://dataset/", "")
    repo = (await db.execute(select(Repo).where(Repo.slug == ds_slug))).scalar_one()
    files = repo.files or []
    if not files:
        raise ValueError(f"Dataset {ds_slug} tidak memiliki file")
    f = files[0]
    path_key = f.get("path_key") or f"repos/{repo.id}/{f.get('path', 'data.csv')}"
    path_lower = str(f.get("path", "")).lower()
    fmt = "parquet" if path_lower.endswith(".parquet") else "csv"
    synthetic = bool(getattr(repo, "synthetic", False))

    if settings.STORAGE_ENABLED:
        uri = f"s3://{settings.MINIO_BUCKET}/{path_key}"
        reader = f"read_parquet('{uri}')" if fmt == "parquet" else f"read_csv_auto('{uri}')"
        return reader, fmt, synthetic

    url = f.get("url")
    if url:
        reader = f"read_parquet('{url}')" if fmt == "parquet" else f"read_csv_auto('{url}')"
        return reader, fmt, synthetic
    raise ValueError("Storage tidak aktif dan dataset tidak punya URL file")


def _topo(nodes, edges):
    ids = [n["id"] for n in nodes]
    adj = {i: [] for i in ids}
    indeg = {i: 0 for i in ids}
    preds = {i: [] for i in ids}
    for e in edges:
        adj[e["source"]].append(e["target"])
        indeg[e["target"]] += 1
        preds[e["target"]].append(e["source"])
    dq = deque([i for i in ids if indeg[i] == 0])
    order = []
    while dq:
        x = dq.popleft()
        order.append(x)
        for y in adj[x]:
            indeg[y] -= 1
            if indeg[y] == 0:
                dq.append(y)
    return order, preds


def run_dag(con, nodes_by_id, order, preds, source_map, max_rows, run_id):
    layers, lineage, rows_out = {}, {}, 0
    for nid in order:
        n = nodes_by_id[nid]
        if n["type"] == "source":
            reader = source_map[nid][0]
            con.execute(f'CREATE OR REPLACE TEMP VIEW "{nid}" AS SELECT * FROM {reader} LIMIT {max_rows};')
        else:
            inputs = [f'"{p}"' for p in preds[nid]]
            sql = node_sql(n, inputs)
            con.execute(f'CREATE OR REPLACE TEMP VIEW "{nid}" AS {sql};')
        lineage[nid] = {
            "op": n.get("op"),
            "type": n["type"],
            "layer": n.get("layer"),
            "inputs": preds[nid],
            "synthetic_source": source_map[nid][2] if n["type"] == "source" else None,
        }
        layer = n.get("layer")
        if layer or n["type"] == "sink":
            lyr = layer or "gold"
            cnt = con.execute(f'SELECT count(*) FROM "{nid}";').fetchone()[0]
            if settings.STORAGE_ENABLED:
                out = f"s3://{settings.MINIO_BUCKET}/pipelines/{run_id}/{lyr}/{nid}.parquet"
                con.execute(f'COPY (SELECT * FROM "{nid}") TO \'{out}\' (FORMAT PARQUET);')
            else:
                out = f"mock://pipelines/{run_id}/{lyr}/{nid}.parquet"
            layers.setdefault(lyr, []).append({"node": nid, "rows": cnt, "uri": out})
            if lyr == "gold":
                rows_out += cnt
    return layers, lineage, rows_out


async def preview_rows(
    db: AsyncSession,
    spec: dict,
    *,
    limit: int = 50,
) -> list[dict]:
    """Jalankan DAG in-memory dan kembalikan sampel baris dari node sink."""
    nodes = spec.get("nodes") or []
    edges = spec.get("edges") or []
    if not nodes:
        return []
    nodes_by_id = {n["id"]: n for n in nodes}
    order, preds = _topo(nodes, edges)
    sink_ids = [n["id"] for n in nodes if n.get("type") == "sink"]
    if not sink_ids:
        return []
    sink_id = sink_ids[0]
    source_map = {}
    for n in nodes:
        if n.get("type") == "source":
            sid = (n.get("params") or {}).get("source_id")
            if not sid:
                raise ValueError("Node source tanpa source_id")
            source_map[n["id"]] = await _resolve_source(db, sid)
    con = _connect()
    try:
        run_dag(con, nodes_by_id, order, preds, source_map, max(limit, 1), "preview")
        cols = [d[0] for d in con.execute(f'DESCRIBE SELECT * FROM "{sink_id}";').fetchall()]
        fetched = con.execute(f'SELECT * FROM "{sink_id}" LIMIT {int(limit)};').fetchall()
        return [dict(zip(cols, row)) for row in fetched]
    finally:
        con.close()
