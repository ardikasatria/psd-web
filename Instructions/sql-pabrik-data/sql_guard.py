"""
Guard SQL untuk node SQL mentah (SELECT-only, tersandbox).

Hanya izinkan SATU pernyataan SELECT/WITH. Tolak DDL/DML, akses file/ekstensi,
konfigurasi, tabel sistem, komentar (anti-obfuscation). Bukan pengganti sandbox
DuckDB (enable_external_access=false) — lapisan pertahanan tambahan.
"""
from __future__ import annotations

import re

from .dag import PipelineError

# Token/kata kunci terlarang (dicek dengan batas kata).
_FORBIDDEN = [
    "attach", "detach", "copy", "install", "load", "pragma", "set", "reset",
    "create", "insert", "update", "delete", "drop", "alter", "truncate",
    "call", "export", "import", "vacuum", "checkpoint",
    "read_csv", "read_parquet", "read_json", "read_text", "read_blob",
    "glob", "sniff_csv", "parquet_scan", "csv_scan",
    "information_schema", "duckdb_settings", "duckdb_functions", "pg_catalog", "sqlite_",
]


def validate_select_sql(sql: str) -> str:
    s = (sql or "").strip().rstrip(";").strip()
    if not s:
        raise PipelineError(422, "empty_sql", "SQL kosong.")
    if "--" in s or "/*" in s:
        raise PipelineError(422, "sql_comment", "Komentar tidak diizinkan dalam SQL.")
    if ";" in s:
        raise PipelineError(422, "multi_statement", "Hanya satu pernyataan SELECT diizinkan.")
    low = s.lower()
    if not (low.startswith("select") or low.startswith("with")):
        raise PipelineError(422, "not_select", "Hanya SELECT/WITH yang diizinkan.")
    for kw in _FORBIDDEN:
        if re.search(rf"\b{re.escape(kw)}\b", low):
            raise PipelineError(422, "forbidden_sql", f"Konstruksi tidak diizinkan: {kw}")
    return s
