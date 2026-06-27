import re

from app.core.errors import ApiError

_IDENT = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")
_EXPR_OK = re.compile(r"^[A-Za-z0-9_+\-*/().,\s]+$")
_OPS = {"=": "=", "!=": "<>", ">": ">", "<": "<", ">=": ">=", "<=": "<=", "in": "IN", "contains": "LIKE"}
_AGG = {"sum": "SUM", "avg": "AVG", "count": "COUNT", "min": "MIN", "max": "MAX"}
_CAST = {"int": "BIGINT", "double": "DOUBLE", "varchar": "VARCHAR", "date": "DATE", "bool": "BOOLEAN"}


def ident(name: str) -> str:
    if not isinstance(name, str) or not _IDENT.match(name):
        raise ApiError(422, "bad_identifier", f"Nama kolom tidak valid: {name}")
    return f'"{name}"'


def lit(v):
    if isinstance(v, bool):
        return "TRUE" if v else "FALSE"
    if isinstance(v, (int, float)):
        return str(v)
    if v is None:
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"


def build_filter(params: dict) -> str:
    col = ident(params["column"])
    op = params.get("op", "=")
    if op not in _OPS:
        raise ApiError(422, "bad_op", f"Operator filter tak dikenal: {op}")
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
        if fn not in _AGG:
            raise ApiError(422, "bad_agg", f"Agregasi tak dikenal: {fn}")
        aggs.append(f"{_AGG[fn]}({ident(a['col'])}) AS {ident(a.get('as', a['col']))}")
    sel = ", ".join(gb + aggs) or "*"
    g = f" GROUP BY {', '.join(gb)}" if gb else ""
    return f"SELECT {sel} FROM {src_rel}{g}"


def cast_sql(src_rel: str, params: dict) -> str:
    casts = []
    for c in params.get("casts", []):
        to = c.get("to")
        if to not in _CAST:
            raise ApiError(422, "bad_cast", f"Tipe cast tak dikenal: {to}")
        casts.append(f"CAST({ident(c['col'])} AS {_CAST[to]}) AS {ident(c['col'])}")
    exclude = ", ".join(ident(c["col"]) for c in params.get("casts", []))
    return f"SELECT * EXCLUDE ({exclude}), {', '.join(casts)} FROM {src_rel}"


def node_sql(node: dict, inputs: list[str]) -> str:
    t = node.get("type")
    op = node.get("op")
    p = node.get("params") or {}
    if t == "source":
        return inputs[0]
    rel = inputs[0]
    if t == "sink":
        return f"SELECT * FROM {rel}"
    if op == "select":
        return select_sql(rel, p.get("columns"))
    if op == "filter":
        return f"SELECT * FROM {rel} WHERE {build_filter(p)}"
    if op == "aggregate":
        return aggregate_sql(rel, p)
    if op == "cast":
        return cast_sql(rel, p)
    if op == "derive":
        return f"SELECT *, {build_derive(p)} FROM {rel}"
    if op == "dedupe":
        return f"SELECT DISTINCT * FROM {rel}"
    if op == "join":
        how = {"inner": "INNER", "left": "LEFT"}.get(p.get("how", "inner"), "INNER")
        lo = ident(p["left_on"])
        ro = ident(p["right_on"])
        return f"SELECT * FROM {inputs[0]} a {how} JOIN {inputs[1]} b ON a.{lo} = b.{ro}"
    raise ApiError(422, "bad_node", f"Node tak dapat diterjemahkan: {node.get('id')}")
