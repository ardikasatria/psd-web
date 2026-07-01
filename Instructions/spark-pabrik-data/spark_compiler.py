"""
Kompiler DAG kanvas → skrip PySpark (DataFrame API).

Node visual (source/filter/select/aggregate/join) di-GENERATE jadi kode aman.
Node 'pyspark' (kode .py mentah) TIDAK di-guard statis — dibungkus kontrak fungsi
`def transform(inputs): ... return df` dan DIJALANKAN DALAM SPARK JOB TERISOLASI
(lihat spark_job.py). Node SQL memakai Spark SQL (guard sama seperti DuckDB).
"""
from __future__ import annotations

import re

from .dag import PipelineError, find_sink, inputs_map, topological_order
from .sql_guard import validate_select_sql

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _name(n: str) -> str:
    if not _IDENT.match(n or ""):
        raise PipelineError(422, "bad_identifier", f"Identifier tak valid: {n}")
    return n


def _var(nid: str) -> str:
    return f"df_{_name(nid)}"


def _compile_node_spark(node, in_vars, nid) -> list[str]:
    t = node.get("type")
    p = node.get("params", {})
    var = _var(nid)

    if t == "source":
        rel = _name(p.get("relation", ""))
        return [f'{var} = spark.table("{rel}")']
    if t == "filter":
        pred = p.get("predicate", "").strip()
        validate_select_sql("SELECT 1 WHERE " + pred)          # guard ekspresi (Spark SQL)
        return [f'{var} = {in_vars[0]}.filter("{pred}")']
    if t == "select":
        cols = p.get("columns") or []
        args = ", ".join(f'"{_name(c)}"' for c in cols)
        return [f"{var} = {in_vars[0]}.select({args})" if cols else f"{var} = {in_vars[0]}"]
    if t == "aggregate":
        group = [f'"{_name(g)}"' for g in (p.get("group_by") or [])]
        _FN = {"count", "sum", "avg", "min", "max"}
        aggs = []
        for a in (p.get("aggregations") or []):
            fn = a.get("fn", "").lower()
            if fn not in _FN:
                raise PipelineError(422, "bad_agg", f"Fungsi agregasi tak diizinkan: {fn}")
            col = a.get("column", "")
            aggs.append(f'F.{fn}("{_name(col)}").alias("{_name(a["as"])}")')
        grp = ", ".join(group)
        return [f"{var} = {in_vars[0]}.groupBy({grp}).agg({', '.join(aggs)})"]
    if t == "join":
        if len(in_vars) < 2:
            raise PipelineError(422, "join_inputs", "Node join butuh dua input.")
        on = p.get("on", "").strip()
        validate_select_sql("SELECT 1 WHERE " + on)
        how = p.get("how", "inner").lower()
        if how not in ("inner", "left", "right", "full"):
            raise PipelineError(422, "bad_join", f"Tipe join tak diizinkan: {how}")
        return [f'{var} = {in_vars[0]}.join({in_vars[1]}, on=F.expr("{on}"), how="{how}")']
    if t == "pyspark":
        # Kode .py mentah: BUKAN di-guard statis; keamanan lewat ISOLASI Spark job.
        code = p.get("code", "")
        if not code.strip():
            raise PipelineError(422, "empty_code", "Kode PySpark kosong.")
        lines = [f"def _node_{_name(nid)}(inputs):"]
        for ln in code.splitlines():
            lines.append("    " + ln)
        lines.append(f"{var} = _node_{_name(nid)}([{', '.join(in_vars)}])")
        return lines
    raise PipelineError(422, "bad_node_type", f"Jenis node tak dikenal: {t}")


HEADER = ("from pyspark.sql import SparkSession, functions as F\n"
          "spark = SparkSession.builder.getOrCreate()\n")


def compile_pipeline_pyspark(nodes, edges) -> str:
    order = topological_order(nodes, edges)
    sink = find_sink(nodes, edges)
    ins = inputs_map(edges)
    by_id = {n["id"]: n for n in nodes}

    body: list[str] = []
    for nid in order:
        in_vars = [_var(i) for i in ins.get(nid, [])]
        body.extend(_compile_node_spark(by_id[nid], in_vars, nid))
    body.append(f"result = {_var(sink)}")
    return HEADER + "\n".join(body) + "\n"


def has_raw_code(nodes) -> bool:
    return any(n.get("type") == "pyspark" for n in nodes)
