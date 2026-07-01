"""
Kompiler DAG kanvas → SQL DuckDB (berbasis CTE).

Tiap node jadi satu CTE bernama id-nya; pipeline dieksekusi sebagai `WITH ... SELECT`.
Node visual (source/filter/select/aggregate/join) dikompilasi ke SQL; node 'sql'
memakai SQL mentah tervalidasi (SELECT-only) yang merujuk CTE input.
"""
from __future__ import annotations

import re

from .dag import PipelineError, find_sink, inputs_map, topological_order
from .sql_guard import validate_select_sql

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


def _ident(name: str) -> str:
    if not _IDENT.match(name or ""):
        raise PipelineError(422, "bad_identifier", f"Identifier tak valid: {name}")
    return f'"{name}"'


def _q(nid: str) -> str:
    return f'"{nid}"'


def _compile_source(node) -> str:
    # Sumber = relasi terdaftar (view dataset yang sudah didaftarkan platform).
    rel = node["params"].get("relation")
    return f"SELECT * FROM {_ident(rel)}"


def _compile_filter(node, ins) -> str:
    pred = node["params"].get("predicate", "").strip()
    validate_select_sql("SELECT 1 WHERE " + pred)   # guard ringan predikat
    return f"SELECT * FROM {_q(ins[0])} WHERE {pred}"


def _compile_select(node, ins) -> str:
    cols = node["params"].get("columns") or []
    if not cols:
        return f"SELECT * FROM {_q(ins[0])}"
    sel = ", ".join(_ident(c) for c in cols)
    return f"SELECT {sel} FROM {_q(ins[0])}"


def _compile_aggregate(node, ins) -> str:
    group = node["params"].get("group_by") or []
    aggs = node["params"].get("aggregations") or []   # [{fn, column, as}]
    _ALLOWED_FN = {"count", "sum", "avg", "min", "max"}
    parts = [_ident(g) for g in group]
    for a in aggs:
        fn = a.get("fn", "").lower()
        if fn not in _ALLOWED_FN:
            raise PipelineError(422, "bad_agg", f"Fungsi agregasi tak diizinkan: {fn}")
        col = "*" if (fn == "count" and not a.get("column")) else _ident(a["column"])
        parts.append(f"{fn}({col}) AS {_ident(a['as'])}")
    grp = f" GROUP BY {', '.join(_ident(g) for g in group)}" if group else ""
    return f"SELECT {', '.join(parts)} FROM {_q(ins[0])}{grp}"


def _compile_join(node, ins) -> str:
    if len(ins) < 2:
        raise PipelineError(422, "join_inputs", "Node join butuh dua input.")
    on = node["params"].get("on", "").strip()
    validate_select_sql("SELECT 1 WHERE " + on)
    how = node["params"].get("how", "inner").upper()
    if how not in ("INNER", "LEFT", "RIGHT", "FULL"):
        raise PipelineError(422, "bad_join", f"Tipe join tak diizinkan: {how}")
    return f"SELECT * FROM {_q(ins[0])} {how} JOIN {_q(ins[1])} ON {on}"


def _compile_sql(node) -> str:
    return validate_select_sql(node["params"].get("sql", ""))


_COMPILERS = {
    "source": lambda n, ins: _compile_source(n),
    "filter": _compile_filter,
    "select": _compile_select,
    "aggregate": _compile_aggregate,
    "join": _compile_join,
    "sql": lambda n, ins: _compile_sql(n),
}


def compile_pipeline(nodes, edges) -> str:
    order = topological_order(nodes, edges)
    sink = find_sink(nodes, edges)
    ins = inputs_map(edges)
    by_id = {n["id"]: n for n in nodes}

    ctes = []
    for nid in order:
        node = by_id[nid]
        ntype = node.get("type")
        if ntype not in _COMPILERS:
            raise PipelineError(422, "bad_node_type", f"Jenis node tak dikenal: {ntype}")
        body = _COMPILERS[ntype](node, ins.get(nid, []))
        ctes.append(f"{_q(nid)} AS (\n  {body}\n)")

    return "WITH " + ",\n".join(ctes) + f"\nSELECT * FROM {_q(sink)}"
