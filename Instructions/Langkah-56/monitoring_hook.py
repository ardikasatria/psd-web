"""
Hook pemantauan otomatis (Langkah 56, sub-langkah 3).

Mencatat latensi (dan metrik serving lain) ke tabel gold monitoring yang SAMA
dengan Langkah 55 (`monitoring_model_metrics`), agar satu dashboard melayani
registry, drift, dan serving.
"""
from __future__ import annotations

import time

GOLD_TABLE = "monitoring_model_metrics"


def latency_row(*, model_name: str, model_version: str, latency_ms: float,
                computed_at: float | None = None) -> dict:
    return {
        "model_name": model_name,
        "model_version": str(model_version),
        "feature": "__serving__",
        "metric": "latency_ms",
        "value": round(float(latency_ms), 3),
        "status": "ok",
        "computed_at": computed_at or time.time(),
    }


def make_latency_logger(write_fn, *, version_lookup=None):
    """Bangun log_fn untuk InferenceService yang menulis baris latensi ke gold."""
    def log_fn(*, model_name, stage, latency_ms, n):
        version = version_lookup(model_name, stage) if version_lookup else stage
        write_fn([latency_row(model_name=model_name, model_version=version,
                              latency_ms=latency_ms)])
    return log_fn
