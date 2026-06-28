"""
Pemilih engine per pipeline (Langkah 54, sub-langkah 3).

Aturan:
  1. Pilihan eksplisit di spec menang ('duckdb'/'spark').
  2. 'auto' → bandingkan estimasi ukuran data dengan ambang. Besar → Spark.
  3. Default DuckDB (cukup untuk pengajaran; hindari biaya Spark tanpa perlu).
"""
from __future__ import annotations

from .spec import Pipeline

# Ambang default: di bawah ini DuckDB; di atas pertimbangkan Spark.
DEFAULT_THRESHOLD_BYTES = 5 * 1024 ** 3   # 5 GiB


def choose_engine(pipeline: Pipeline, *, est_bytes: int | None = None,
                  threshold_bytes: int = DEFAULT_THRESHOLD_BYTES,
                  default: str = "duckdb") -> str:
    explicit = (pipeline.engine or "auto").lower()
    if explicit in ("duckdb", "spark"):
        return explicit
    if est_bytes is not None and est_bytes >= threshold_bytes:
        return "spark"
    return default
