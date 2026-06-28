"""
Baris monitoring untuk tabel gold (Langkah 55, sub-langkah 2 & 3).

Dashboard monitoring (sub-langkah 3) memakai ulang Ruang Analitik (Langkah 46)
membaca tabel gold ini.

Skema tabel gold yang disarankan: monitoring_model_metrics
  model_name TEXT, model_version TEXT, feature TEXT, metric TEXT,
  value DOUBLE, status TEXT, computed_at TIMESTAMP
"""
from __future__ import annotations

import time

GOLD_TABLE = "monitoring_model_metrics"


def drift_row(
    *,
    model_name: str,
    model_version: str,
    feature: str,
    metric: str,
    value: float,
    status: str,
    computed_at: float | None = None,
) -> dict:
    return {
        "model_name": model_name,
        "model_version": str(model_version),
        "feature": feature,
        "metric": metric,
        "value": round(float(value), 6),
        "status": status,
        "computed_at": computed_at or time.time(),
    }


def metric_row(
    *,
    model_name: str,
    model_version: str,
    metric: str,
    value: float,
    status: str = "ok",
    computed_at: float | None = None,
) -> dict:
    """Metrik level-model (akurasi, distribusi prediksi, dll.) — feature='__model__'."""
    return drift_row(
        model_name=model_name,
        model_version=model_version,
        feature="__model__",
        metric=metric,
        value=value,
        status=status,
        computed_at=computed_at,
    )


def collect_alerts(rows: list[dict]) -> list[dict]:
    """Baris berstatus 'significant' → kandidat alert."""
    return [r for r in rows if r.get("status") == "significant"]
