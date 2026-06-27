from app.core.errors import ApiError
from app.modules.factory.engine import _connect
from app.modules.factory.sql import ident

_AGG = {"sum": "SUM", "avg": "AVG", "count": "COUNT", "min": "MIN", "max": "MAX"}


def _parquet_rel(uri: str) -> str:
    safe = uri.replace("'", "''")
    return f"read_parquet('{safe}')"


def widget_data(uri: str, kind: str, q: dict) -> dict:
    con = _connect()
    try:
        rel = _parquet_rel(uri)
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
                sql = (
                    f"SELECT {x} AS x, {_AGG.get(q['agg'], 'SUM')}({ident(q['y'])}) AS y "
                    f"FROM {rel} GROUP BY {x} ORDER BY {x} LIMIT {limit};"
                )
            else:
                sql = f"SELECT {x} AS x, {ident(q['y'])} AS y FROM {rel} ORDER BY {x} LIMIT {limit};"
            return {"points": con.execute(sql).df().to_dict("records")}
        if kind == "pie":
            sql = (
                f"SELECT {ident(q['label'])} AS label, "
                f"{_AGG.get(q.get('agg', 'sum'), 'SUM')}({ident(q['value'])}) AS value "
                f"FROM {rel} GROUP BY label ORDER BY value DESC LIMIT {limit};"
            )
            return {"slices": con.execute(sql).df().to_dict("records")}
        if kind == "scatter":
            sql = f"SELECT {ident(q['x'])} AS x, {ident(q['y'])} AS y FROM {rel} LIMIT {limit};"
            return {"points": con.execute(sql).df().to_dict("records")}
        raise ApiError(422, "bad_kind", "Jenis widget tidak dikenal")
    finally:
        con.close()
