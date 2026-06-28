"""Adaptor spec PSD Langkah 44–45 → engine.Pipeline (Langkah 54)."""
from __future__ import annotations

from collections import deque

from app.modules.factory.models import Pipeline as PipelineModel
from app.modules.factory.sql import node_sql

from .spec import Node, Pipeline


def _topo(nodes: list[dict], edges: list[dict]) -> tuple[list[str], dict[str, list[str]]]:
    ids = [n["id"] for n in nodes]
    indeg = {i: 0 for i in ids}
    preds: dict[str, list[str]] = {i: [] for i in ids}
    for e in edges:
        s, t = e["source"], e["target"]
        indeg[t] += 1
        preds[t].append(s)
    dq = deque([i for i in ids if indeg[i] == 0])
    order: list[str] = []
    while dq:
        x = dq.popleft()
        order.append(x)
        for e in edges:
            if e["source"] == x:
                indeg[e["target"]] -= 1
                if indeg[e["target"]] == 0:
                    dq.append(e["target"])
    if len(order) != len(ids):
        raise ValueError("Pipeline memiliki siklus (DAG tidak valid).")
    return order, preds


def _spark_sql(node: dict, input_ids: list[str]) -> str:
    quoted = [f'"{i}"' for i in input_ids]
    sql = node_sql(node, quoted)
    for i in input_ids:
        sql = sql.replace(f'"{i}"', i)
    return sql


def from_psd_pipeline(pl: PipelineModel) -> Pipeline:
    spec = pl.spec_json or {"nodes": [], "edges": []}
    nodes_raw = spec.get("nodes") or []
    edges = spec.get("edges") or []
    nodes_by_id = {n["id"]: n for n in nodes_raw}
    order, preds = _topo(nodes_raw, edges)
    engine_nodes: list[Node] = []

    for nid in order:
        n = nodes_by_id[nid]
        t = n.get("type")
        p = n.get("params") or {}
        ins = preds.get(nid, [])

        if t == "source":
            sid = p.get("source_id", "")
            engine_nodes.append(
                Node(
                    id=nid,
                    type="source",
                    params={"source_id": sid, "uri": f"psd://source/{sid}"},
                )
            )
        elif t == "transform" and n.get("op") == "join":
            left, right = ins[0], ins[1]
            on = f"{left}.{p['left_on']} = {right}.{p['right_on']}"
            engine_nodes.append(
                Node(
                    id=nid,
                    type="join",
                    params={"how": p.get("how", "inner"), "on": on},
                    inputs=ins,
                )
            )
        elif t == "transform":
            sql = _spark_sql(n, ins)
            engine_nodes.append(Node(id=nid, type="sql", params={"sql": sql}, inputs=ins))
        elif t == "sink":
            layer = n.get("layer") or "gold"
            engine_nodes.append(
                Node(
                    id=nid,
                    type="sink",
                    params={"target": f"{layer}.{nid}", "format": "parquet"},
                    inputs=ins,
                )
            )
        else:
            raise ValueError(f"Tipe node tak didukung adaptor: {t}")

    return Pipeline(id=pl.id, nodes=engine_nodes, engine=getattr(pl, "engine", None) or "auto")
