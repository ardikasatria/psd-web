"""
Pemilihan ENGINE eksекusi Pabrik Data.

- duckdb : data kecil/menengah, single-node, interaktif cepat (jalur SQL).
- spark  : data besar/terdistribusi (jalur PySpark yang di-generate atau Spark SQL,
           serta node kode .py terisolasi).
Auto-route berdasar estimasi ukuran, atau pilihan eksplisit user.
"""
from __future__ import annotations

ENGINES = {"duckdb", "spark"}
DEFAULT_THRESHOLD_BYTES = 1_000_000_000   # ~1 GB → naik ke Spark


class EngineError(Exception):
    def __init__(self, status: int, slug: str, message: str):
        super().__init__(message)
        self.status = status
        self.slug = slug
        self.message = message


def validate_engine(engine: str) -> str:
    if engine not in ENGINES:
        raise EngineError(422, "bad_engine", f"Engine tak dikenal: {engine}")
    return engine


def choose_engine(*, requested: str | None = None, est_bytes: int | None = None,
                  threshold_bytes: int = DEFAULT_THRESHOLD_BYTES) -> str:
    if requested:
        return validate_engine(requested)
    if est_bytes is not None and est_bytes > threshold_bytes:
        return "spark"
    return "duckdb"
