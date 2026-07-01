"""Kompilasi read-only pipeline → SQL atau PySpark (transparansi kanvas)."""
from __future__ import annotations


def compile_pipeline_script(spec: dict, engine: str) -> tuple[str, str]:
    nodes = spec.get("nodes") or []
    lines: list[str] = []

    if engine == "spark":
        lines.append("from pyspark.sql import functions as F")
        lines.append("")
        for n in nodes:
            nid = n.get("id", "node")
            t = n.get("type")
            op = n.get("op")
            params = n.get("params") or {}
            if t == "source":
                lines.append(f"# {nid}: baca sumber dataset")
                lines.append(f'{nid} = spark.read.parquet("psd://dataset/...")')
            elif t == "transform" and op == "sql":
                q = str(params.get("query") or "").strip()
                lines.append(f"# {nid}: Spark SQL")
                lines.append(q or f"-- SELECT * FROM {nid}_upstream")
            elif t == "transform" and op == "pyspark":
                lines.append(f"# {nid}: kode PySpark kustom")
                lines.append(str(params.get("code") or "def transform(inputs):\n    return inputs[0]"))
            elif t == "transform":
                lines.append(f"# {nid}: {op}")
                lines.append(f"{nid} = {nid}_in  # transform: {op}")
            elif t == "sink":
                lines.append(f"# {nid}: tulis gold parquet")
                lines.append(f'{nid}_in.write.mode("overwrite").parquet("psd://dataset/output/...")')
            lines.append("")
        return "\n".join(lines).strip(), "pyspark"

    for n in nodes:
        nid = n.get("id", "node")
        t = n.get("type")
        op = n.get("op")
        params = n.get("params") or {}
        if t == "source":
            lines.append(f"-- {nid}: CREATE VIEW dari sumber")
            lines.append(f"CREATE OR REPLACE VIEW {nid} AS SELECT * FROM read_parquet('psd://...');")
        elif t == "transform" and op == "sql":
            q = str(params.get("query") or "").strip()
            lines.append(f"-- {nid}: SQL kustom")
            lines.append(q or f"SELECT * FROM upstream_{nid}")
        elif t == "transform" and op == "filter":
            col = params.get("column") or params.get("col") or "col"
            lines.append(
                f"CREATE OR REPLACE VIEW {nid} AS SELECT * FROM {nid}_in "
                f"WHERE {col} {params.get('op', '=')} '{params.get('value', '')}';"
            )
        elif t == "transform" and op == "select":
            cols = ", ".join(params.get("columns") or []) or "*"
            lines.append(f"CREATE OR REPLACE VIEW {nid} AS SELECT {cols} FROM {nid}_in;")
        elif t == "transform":
            lines.append(f"-- {nid}: {op}")
            lines.append(f"CREATE OR REPLACE VIEW {nid} AS SELECT * FROM {nid}_in;")
        elif t == "sink":
            lines.append(f"-- {nid}: materialisasi gold")
            lines.append(f"COPY (SELECT * FROM {nid}_in) TO 'psd://dataset/output/...' (FORMAT parquet);")
        lines.append("")
    return "\n".join(lines).strip(), "sql"
