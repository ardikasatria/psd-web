"""Pemilih engine per pipeline (Langkah 54)."""
from __future__ import annotations

from .spec import Pipeline

DEFAULT_THRESHOLD_BYTES = 5 * 1024**3


def choose_engine(
    pipeline: Pipeline,
    *,
    est_bytes: int | None = None,
    threshold_bytes: int = DEFAULT_THRESHOLD_BYTES,
    default: str = "duckdb",
) -> str:
    explicit = (pipeline.engine or "auto").lower()
    if explicit in ("duckdb", "spark"):
        return explicit
    if est_bytes is not None and est_bytes >= threshold_bytes:
        return "spark"
    return default
